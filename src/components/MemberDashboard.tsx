import React, { useState, useEffect, useRef } from 'react';
import { Users, Trophy, Settings, Edit, Save, X, Plus, Trash2, ChevronDown, ChevronUp, CheckCircle, History, ArrowLeft } from 'lucide-react';
import { useMembers, TopMember } from '../hooks/useMembers';
import { useMemberDiscounts } from '../hooks/useMemberDiscounts';
import { useMenu } from '../hooks/useMenu';
import { Member, MemberStatus, MemberUserType, Order } from '../types';
import { MenuItem, Variation } from '../types';
import { supabase } from '../lib/supabase';

const MemberDashboard: React.FC = () => {
  const { members, topMembers, loading, fetchMembers, updateMember } = useMembers();
  const { menuItems } = useMenu();
  const { fetchDiscountsByGame, setDiscount, deleteDiscount } = useMemberDiscounts();
  
  const [activeTab, setActiveTab] = useState<'top' | 'manage' | 'discounts'>('top');
  const [memberFilter, setMemberFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedGame, setSelectedGame] = useState<MenuItem | null>(null);
  const [gameDiscounts, setGameDiscounts] = useState<any[]>([]);
  const [editingDiscount, setEditingDiscount] = useState<string | null>(null);
  const [editingAll, setEditingAll] = useState(false);
  const [selectAllGames, setSelectAllGames] = useState(false);
  const [discountTarget, setDiscountTarget] = useState<'resellers' | 'members'>('resellers');
  const [viewingMemberOrders, setViewingMemberOrders] = useState<Member | null>(null);
  const [memberOrders, setMemberOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [memberOrderCounts, setMemberOrderCounts] = useState<Record<string, number>>({});
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [allDiscountFormData, setAllDiscountFormData] = useState<{
    discount_percentage: number;
    capital_price: number;
    selling_price: number;
  }>({
    discount_percentage: 0,
    capital_price: 0,
    selling_price: 0
  });
  const [discountFormData, setDiscountFormData] = useState<Record<string, {
    discount_percentage: number;
    capital_price: number;
    selling_price: number;
  }>>({});
  
  const contentRef = useRef<HTMLDivElement>(null);

  // Show notification and auto-hide after 3 seconds
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  useEffect(() => {
    if (selectedMember && selectedGame) {
      loadGameDiscounts();
    } else if (selectedGame && !selectAllGames && (discountTarget === 'resellers' || discountTarget === 'members')) {
      // Initialize game discounts for bulk operations
      const variationDiscounts = (selectedGame.variations || []).map(variation => ({
        variation_id: variation.id,
        variation_name: variation.name,
        existing: null,
        discount_percentage: 0,
        capital_price: 0,
        selling_price: variation.price
      }));
      setGameDiscounts(variationDiscounts);
    }
  }, [selectedMember, selectedGame, selectAllGames, discountTarget]);

  // Refresh members list when switching to discounts tab to ensure fresh data
  useEffect(() => {
    if (activeTab === 'discounts') {
      fetchMembers();
    }
  }, [activeTab, fetchMembers]);

  // Fetch order counts for all members
  useEffect(() => {
    const fetchOrderCounts = async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('member_id')
          .not('member_id', 'is', null);

        if (error) throw error;

        const counts: Record<string, number> = {};
        data.forEach(order => {
          if (order.member_id) {
            counts[order.member_id] = (counts[order.member_id] || 0) + 1;
          }
        });

        setMemberOrderCounts(counts);
      } catch (err) {
        console.error('Error fetching order counts:', err);
      }
    };

    if (activeTab === 'manage') {
      fetchOrderCounts();
    }
  }, [activeTab, members]);

  // Fetch orders for a specific member
  const fetchMemberOrders = async (memberId: string) => {
    try {
      setLoadingOrders(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('member_id', memberId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMemberOrders(data as Order[]);
    } catch (err) {
      console.error('Error fetching member orders:', err);
      setMemberOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleViewMemberOrders = async (member: Member) => {
    setViewingMemberOrders(member);
    await fetchMemberOrders(member.id);
  };

  const getOrderStatus = (order: Order) => {
    const orderOption = order.order_option || 'place_order';
    // For messenger orders with pending status, show "Done via Messenger"
    if (orderOption === 'order_via_messenger' && order.status === 'pending') {
      return 'Done via Messenger';
    }
    return order.status;
  };

  const getOrderStatusClass = (order: Order) => {
    const displayStatus = getOrderStatus(order);
    if (displayStatus === 'Done via Messenger' || displayStatus === 'approved') {
      return 'bg-green-100 text-green-800';
    } else if (displayStatus === 'rejected') {
      return 'bg-red-100 text-red-800';
    } else if (displayStatus === 'processing') {
      return 'bg-yellow-100 text-yellow-800';
    } else {
      return 'bg-gray-100 text-gray-800';
    }
  };

  const loadGameDiscounts = async () => {
    if (!selectedMember || !selectedGame) return;
    
    const discounts = await fetchDiscountsByGame(selectedMember.id, selectedGame.id);
    
    // Create discount entries for all variations
    const discountMap: Record<string, any> = {};
    discounts.forEach(d => {
      const key = d.variation_id || 'base';
      discountMap[key] = d;
    });

    const variationDiscounts = (selectedGame.variations || []).map(variation => {
      const existing = discountMap[variation.id];
      return {
        variation_id: variation.id,
        variation_name: variation.name,
        existing: existing,
        discount_percentage: existing?.discount_percentage || 0,
        capital_price: existing?.capital_price || 0,
        selling_price: existing?.selling_price || variation.price
      };
    });

    setGameDiscounts(variationDiscounts);
  };

  const handleSetDiscount = async (variationId: string) => {
    if (!selectedGame) return;

    const formData = discountFormData[variationId];
    if (!formData) return;

    // Apply to all target members (resellers or members)
    const targetMembers = discountTarget === 'resellers' 
      ? members.filter(m => m.user_type === 'reseller' && m.status === 'active')
      : members.filter(m => m.user_type === 'end_user' && m.status === 'active');

    let totalSuccess = 0;
    let totalAttempts = targetMembers.length;

    for (const member of targetMembers) {
      const success = await setDiscount(
        member.id,
        selectedGame.id,
        variationId,
        formData
      );
      if (success) totalSuccess++;
    }

    setEditingDiscount(null);
    
    // Refresh the table
    if (selectedGame) {
      const variationDiscounts = (selectedGame.variations || []).map(variation => {
        const existing = variation.id === variationId ? { discount_percentage: formData.discount_percentage, capital_price: formData.capital_price, selling_price: formData.selling_price } : null;
        return {
          variation_id: variation.id,
          variation_name: variation.name,
          existing: existing,
          discount_percentage: existing?.discount_percentage || 0,
          capital_price: existing?.capital_price || 0,
          selling_price: existing?.selling_price || variation.price
        };
      });
      setGameDiscounts(variationDiscounts);
    }

    if (totalSuccess === totalAttempts) {
      showNotification('success', `Discount saved for ${totalSuccess} ${discountTarget}`);
    } else {
      showNotification('error', `Only ${totalSuccess} of ${totalAttempts} discount(s) were saved`);
    }
  };

  const handleDeleteDiscount = async (variationId: string) => {
    if (!selectedGame) return;
    
    // Delete from all target members
    const targetMembers = discountTarget === 'resellers' 
      ? members.filter(m => m.user_type === 'reseller' && m.status === 'active')
      : members.filter(m => m.user_type === 'end_user' && m.status === 'active');

    let totalSuccess = 0;
    let totalAttempts = 0;

    for (const member of targetMembers) {
      // Fetch existing discount for this member and variation
      const discounts = await fetchDiscountsByGame(member.id, selectedGame.id);
      const existingDiscount = discounts.find(d => d.variation_id === variationId);
      
      if (existingDiscount) {
        totalAttempts++;
        const success = await deleteDiscount(existingDiscount.id, member.id);
        if (success) totalSuccess++;
      }
    }

    // Refresh the table
    if (selectedGame) {
      const variationDiscounts = (selectedGame.variations || []).map(variation => ({
        variation_id: variation.id,
        variation_name: variation.name,
        existing: variation.id === variationId ? null : (gameDiscounts.find(gd => gd.variation_id === variation.id)?.existing || null),
        discount_percentage: variation.id === variationId ? 0 : (gameDiscounts.find(gd => gd.variation_id === variation.id)?.discount_percentage || 0),
        capital_price: variation.id === variationId ? 0 : (gameDiscounts.find(gd => gd.variation_id === variation.id)?.capital_price || 0),
        selling_price: variation.id === variationId ? variation.price : (gameDiscounts.find(gd => gd.variation_id === variation.id)?.selling_price || variation.price)
      }));
      setGameDiscounts(variationDiscounts);
    }

    if (totalSuccess > 0) {
      showNotification('success', `Discount deleted from ${totalSuccess} ${discountTarget}`);
    } else {
      showNotification('error', 'No discounts found to delete');
    }
  };

  const handleDeleteAllDiscounts = async () => {
    if (!selectedMember) return;
    
    // Get all existing discounts
    const discountsToDelete = gameDiscounts.filter(d => d.existing);
    
    if (discountsToDelete.length === 0) {
      showNotification('error', 'No discounts to delete');
      return;
    }
    
    if (confirm(`Are you sure you want to delete all ${discountsToDelete.length} discount(s) for this game?`)) {
      // Delete all discounts
      let successCount = 0;
      for (const discount of discountsToDelete) {
        if (discount.existing) {
          const success = await deleteDiscount(discount.existing.id, selectedMember.id);
          if (success) successCount++;
        }
      }
      
      await loadGameDiscounts();
      setEditingAll(false);
      if (successCount === discountsToDelete.length) {
        showNotification('success', `All ${successCount} discount(s) deleted successfully`);
      } else {
        showNotification('error', `Only ${successCount} of ${discountsToDelete.length} discount(s) were deleted`);
      }
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center space-x-2 px-4 py-3 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">{notification.message}</span>
        </div>
      )}
      {/* Quick Actions - Same style as customer section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
          <div className="space-y-3">
            <button
              onClick={() => {
                setActiveTab('top');
                // Scroll to content on mobile
                setTimeout(() => {
                  contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
              }}
              className={`w-full flex items-center space-x-3 p-2 md:p-3 text-left hover:bg-gray-50 rounded-lg transition-colors duration-200 ${
                activeTab === 'top' ? 'bg-blue-50' : ''
              }`}
            >
              <Trophy className="h-4 w-4 md:h-5 md:w-5 text-gray-400" />
              <span className="text-sm md:text-base font-medium text-gray-900">Top Members</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('manage');
                // Scroll to content on mobile
                setTimeout(() => {
                  contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
              }}
              className={`w-full flex items-center space-x-3 p-2 md:p-3 text-left hover:bg-gray-50 rounded-lg transition-colors duration-200 ${
                activeTab === 'manage' ? 'bg-blue-50' : ''
              }`}
            >
              <Users className="h-4 w-4 md:h-5 md:w-5 text-gray-400" />
              <span className="text-sm md:text-base font-medium text-gray-900">Manage Members</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('discounts');
                // Scroll to content on mobile
                setTimeout(() => {
                  contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
              }}
              className={`w-full flex items-center space-x-3 p-2 md:p-3 text-left hover:bg-gray-50 rounded-lg transition-colors duration-200 ${
                activeTab === 'discounts' ? 'bg-blue-50' : ''
              }`}
            >
              <Settings className="h-4 w-4 md:h-5 md:w-5 text-gray-400" />
              <span className="text-sm md:text-base font-medium text-gray-900">Set Discounts</span>
            </button>
          </div>
        </div>

        {/* Right panel - can be used for stats or left empty */}
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
          <h3 className="text-base md:text-lg font-playfair font-medium text-black mb-4">Members Overview</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-900">Total Members</span>
              </div>
              <span className="text-sm text-gray-500">{members.length} members</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-900">Resellers</span>
              </div>
              <span className="text-sm text-gray-500">{members.filter(m => m.user_type === 'reseller').length} resellers</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-900">Active Members</span>
              </div>
              <span className="text-sm text-gray-500">{members.filter(m => m.status === 'active').length} active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div ref={contentRef} className="bg-white rounded-lg shadow-sm p-4 md:p-6">
        {/* Top Members Tab */}
        {activeTab === 'top' && (
          <>
          <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4">Top Members by Total Cost</h3>
          {loading ? (
            <div className="text-gray-600">Loading...</div>
          ) : topMembers.length === 0 ? (
            <div className="text-gray-600">No member orders yet.</div>
          ) : (
            <div className="space-y-3">
              {topMembers.map((topMember, index) => (
                <div
                  key={topMember.member.id}
                  className="flex items-center justify-between p-3 md:p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3 md:space-x-4 flex-1 min-w-0">
                    <div className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-blue-600 to-blue-500 rounded-full text-white font-bold text-sm md:text-base flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-gray-900 text-sm md:text-base truncate">{topMember.member.username}</div>
                      <div className="text-xs md:text-sm text-gray-600 truncate">{topMember.member.email}</div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <div className="font-bold text-blue-600 text-base md:text-lg">₱{topMember.total_cost.toFixed(2)}</div>
                    <div className="text-xs text-gray-600">{topMember.total_orders} order{topMember.total_orders !== 1 ? 's' : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          </>
        )}

        {/* Manage Members Tab */}
        {activeTab === 'manage' && (
          <>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <h3 className="text-lg md:text-xl font-bold text-gray-900">All Members</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setMemberFilter('all')}
                className={`px-3 py-2 md:px-4 rounded-lg text-xs md:text-sm font-medium transition-colors ${
                  memberFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setMemberFilter('active')}
                className={`px-3 py-2 md:px-4 rounded-lg text-xs md:text-sm font-medium transition-colors ${
                  memberFilter === 'active'
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setMemberFilter('inactive')}
                className={`px-3 py-2 md:px-4 rounded-lg text-xs md:text-sm font-medium transition-colors ${
                  memberFilter === 'inactive'
                    ? 'bg-red-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Inactive
              </button>
            </div>
          </div>
          {loading ? (
            <div className="text-gray-600">Loading...</div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {members
                  .filter(member => {
                    if (memberFilter === 'all') return true;
                    if (memberFilter === 'active') return member.status === 'active';
                    if (memberFilter === 'inactive') return member.status === 'inactive';
                    return true;
                  })
                  .map((member) => (
                    <div
                      key={member.id}
                      onClick={() => handleViewMemberOrders(member)}
                      className="bg-gray-50 rounded-lg p-4 border border-gray-200 active:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">{member.username}</h4>
                          <p className="text-sm text-gray-600 mb-2">{member.mobile_no}</p>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs text-gray-500">Orders:</span>
                            <span className="font-semibold text-gray-900">{memberOrderCounts[member.id] || 0}</span>
                          </div>
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            member.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {member.status}
                        </span>
                      </div>
                      <div className="flex flex-col gap-2 pt-3 border-t border-gray-200">
                        <select
                          value={member.user_type}
                          onChange={async (e) => {
                            e.stopPropagation();
                            const success = await updateMember(member.id, {
                              user_type: e.target.value as MemberUserType
                            });
                            if (success) {
                              await fetchMembers();
                              if (selectedMember?.id === member.id && e.target.value === 'end_user') {
                                setSelectedMember(null);
                                setSelectedGame(null);
                                setGameDiscounts([]);
                              }
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 text-sm"
                        >
                          <option value="end_user">End User</option>
                          <option value="reseller">Reseller</option>
                        </select>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateMember(member.id, {
                              status: member.status === 'active' ? 'inactive' : 'active'
                            });
                          }}
                          className={`w-full px-3 py-2 rounded text-sm font-semibold ${
                            member.status === 'active'
                              ? 'bg-red-100 text-red-800 active:bg-red-200'
                              : 'bg-green-100 text-green-800 active:bg-green-200'
                          }`}
                        >
                          {member.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-300">
                      <th className="text-left p-3 text-gray-900 font-semibold">Username</th>
                      <th className="text-left p-3 text-gray-900 font-semibold">Mobile No.</th>
                      <th className="text-center p-3 text-gray-900 font-semibold">Total Orders</th>
                      <th className="text-left p-3 text-gray-900 font-semibold">Status</th>
                      <th className="text-left p-3 text-gray-900 font-semibold">User Type</th>
                      <th className="text-left p-3 text-gray-900 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members
                      .filter(member => {
                        if (memberFilter === 'all') return true;
                        if (memberFilter === 'active') return member.status === 'active';
                        if (memberFilter === 'inactive') return member.status === 'inactive';
                        return true;
                      })
                      .map((member) => (
                      <tr 
                        key={member.id} 
                        className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => handleViewMemberOrders(member)}
                      >
                        <td className="p-3 text-gray-900">{member.username}</td>
                        <td className="p-3 text-gray-900">{member.mobile_no}</td>
                        <td className="p-3 text-gray-900 font-semibold text-center">{memberOrderCounts[member.id] || 0}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              member.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {member.status}
                          </span>
                        </td>
                        <td className="p-3">
                          <select
                            value={member.user_type}
                            onChange={async (e) => {
                              e.stopPropagation();
                              const success = await updateMember(member.id, {
                                user_type: e.target.value as MemberUserType
                              });
                              if (success) {
                                await fetchMembers();
                                if (selectedMember?.id === member.id && e.target.value === 'end_user') {
                                  setSelectedMember(null);
                                  setSelectedGame(null);
                                  setGameDiscounts([]);
                                }
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white border border-gray-300 rounded px-2 py-1 text-gray-900 text-sm"
                          >
                            <option value="end_user">End User</option>
                            <option value="reseller">Reseller</option>
                          </select>
                        </td>
                        <td className="p-3">
                          <div className="flex space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateMember(member.id, {
                                  status: member.status === 'active' ? 'inactive' : 'active'
                                });
                              }}
                              className={`px-3 py-1 rounded text-xs font-semibold ${
                                member.status === 'active'
                                  ? 'bg-red-100 text-red-800 hover:bg-red-200'
                                  : 'bg-green-100 text-green-800 hover:bg-green-200'
                              }`}
                            >
                              {member.status === 'active' ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          </>
        )}

        {/* Member Orders Modal */}
        {viewingMemberOrders && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-none md:rounded-lg shadow-xl max-w-4xl w-full h-full md:h-auto md:max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <button
                    onClick={() => setViewingMemberOrders(null)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                  >
                    <ArrowLeft className="h-5 w-5 text-gray-600" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg md:text-xl font-bold text-gray-900 truncate">Order History</h3>
                    <p className="text-xs md:text-sm text-gray-600 truncate">{viewingMemberOrders.username} ({viewingMemberOrders.email})</p>
                  </div>
                </div>
                <button
                  onClick={() => setViewingMemberOrders(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 md:block hidden"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
              </div>

              {/* Orders List */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6">
                {loadingOrders ? (
                  <div className="text-center text-gray-600 py-8">Loading orders...</div>
                ) : memberOrders.length === 0 ? (
                  <div className="text-center text-gray-600 py-8">No orders found for this member.</div>
                ) : (
                  <>
                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-3">
                      {memberOrders.map((order) => (
                        <div key={order.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-mono text-sm text-gray-900 mb-1">#{order.id.slice(0, 8)}</p>
                              <p className="text-xs text-gray-600">{new Date(order.created_at).toLocaleString()}</p>
                            </div>
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold flex-shrink-0 ml-2 ${getOrderStatusClass(order)}`}
                            >
                              {getOrderStatus(order)}
                            </span>
                          </div>
                          <div className="space-y-2 pt-3 border-t border-gray-200">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Items:</span>
                              <span className="text-gray-900 font-medium">{Array.isArray(order.order_items) ? order.order_items.length : 0} item(s)</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Payment:</span>
                              <span className="text-gray-900">{order.payment_method_id || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                              <span className="text-gray-600 font-medium">Total:</span>
                              <span className="text-gray-900 font-bold text-lg">₱{order.total_price.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-300">
                            <th className="text-left p-3 text-gray-900 font-semibold">Order ID</th>
                            <th className="text-left p-3 text-gray-900 font-semibold">Date</th>
                            <th className="text-left p-3 text-gray-900 font-semibold">Items</th>
                            <th className="text-left p-3 text-gray-900 font-semibold">Payment Method</th>
                            <th className="text-left p-3 text-gray-900 font-semibold">Status</th>
                            <th className="text-left p-3 text-gray-900 font-semibold">Total Order</th>
                          </tr>
                        </thead>
                        <tbody>
                          {memberOrders.map((order) => (
                            <tr key={order.id} className="border-b border-gray-200 hover:bg-gray-50">
                              <td className="p-3 text-gray-900 font-mono text-sm">
                                #{order.id.slice(0, 8)}
                              </td>
                              <td className="p-3 text-gray-600 text-sm">
                                {new Date(order.created_at).toLocaleString()}
                              </td>
                              <td className="p-3 text-gray-600 text-sm">
                                {Array.isArray(order.order_items) ? order.order_items.length : 0} item(s)
                              </td>
                              <td className="p-3 text-gray-600 text-sm">
                                {order.payment_method_id || 'N/A'}
                              </td>
                              <td className="p-3">
                                <span
                                  className={`px-2 py-1 rounded text-xs font-semibold ${getOrderStatusClass(order)}`}
                                >
                                  {getOrderStatus(order)}
                                </span>
                              </td>
                              <td className="p-3 text-gray-900 font-bold">
                                ₱{order.total_price.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Set Discounts Tab */}
        {activeTab === 'discounts' && (
          <>
          <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4">Set Member Discounts</h3>
          
          {/* Member and Game Selection - Row on desktop, stacked on mobile */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
          {/* Set Discounts To Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Set Discounts to?</label>
            <select
              value={discountTarget}
              onChange={(e) => {
                const target = e.target.value as 'resellers' | 'members';
                setDiscountTarget(target);
                setSelectedMember(null);
                setSelectedGame(null);
                setGameDiscounts([]);
              }}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 md:px-4 md:py-3 text-gray-900 mb-4 text-sm md:text-base"
            >
              <option value="resellers">Resellers</option>
              <option value="members">Members</option>
            </select>

            {/* Display selected target info as subtitle */}
            {discountTarget === 'resellers' && (
              <p className="text-xs md:text-sm text-gray-600 mt-1">
                All Resellers Selected ({members.filter(m => m.user_type === 'reseller' && m.status === 'active').length} active resellers)
              </p>
            )}

            {discountTarget === 'members' && (
              <p className="text-xs md:text-sm text-gray-600 mt-1">
                All Members Selected ({members.filter(m => m.user_type === 'end_user' && m.status === 'active').length} active end users)
              </p>
            )}
          </div>

          {/* Game Selection */}
          {(discountTarget === 'resellers' || discountTarget === 'members') && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Choose Game</label>
              <div className="flex items-center gap-3 mb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectAllGames}
                    onChange={(e) => {
                      setSelectAllGames(e.target.checked);
                      if (e.target.checked) {
                        setSelectedGame(null);
                        setEditingAll(true);
                        setAllDiscountFormData({
                          discount_percentage: 0,
                          capital_price: 0,
                          selling_price: 0
                        });
                      } else {
                        setEditingAll(false);
                      }
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-900">Select All Games</span>
                </label>
              </div>
              {!selectAllGames && (
                <select
                  value={selectedGame?.id || ''}
                  onChange={(e) => {
                    const game = menuItems.find(m => m.id === e.target.value);
                    setSelectedGame(game || null);
                    // Initialize game discounts when game is selected
                    if (game) {
                      const variationDiscounts = (game.variations || []).map(variation => ({
                        variation_id: variation.id,
                        variation_name: variation.name,
                        existing: null,
                        discount_percentage: 0,
                        capital_price: 0,
                        selling_price: variation.price
                      }));
                      setGameDiscounts(variationDiscounts);
                    } else {
                      setGameDiscounts([]);
                    }
                  }}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 md:px-4 md:py-3 text-gray-900 text-sm md:text-base"
                >
                  <option value="">Choose Game</option>
                  {menuItems.map(game => (
                    <option key={game.id} value={game.id}>
                      {game.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
          </div>

          {/* Discount Table / Bulk Discount Form */}
          {(discountTarget === 'resellers' || discountTarget === 'members') && (selectedGame || selectAllGames) && (
            <>
              {/* Edit All Button - Outside scrollable area */}
              {!editingAll && !selectAllGames && (
                <div className="flex justify-end mb-4">
                  <button
                    onClick={() => {
                      setEditingAll(true);
                      // Initialize with default values
                      setAllDiscountFormData({
                        discount_percentage: 0,
                        capital_price: 0,
                        selling_price: 0
                      });
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg active:bg-blue-700 hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Edit All
                  </button>
                </div>
              )}

              <div className="overflow-x-auto">
                {/* Edit All Section */}
                {editingAll || selectAllGames ? (
                  <div className="mb-6">
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-300">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-gray-900">
                          {selectAllGames ? 'Set Discounts for All Games' : 'Set Discounts for All Packages'}
                        </h4>
                        <button
                          onClick={() => {
                            setEditingAll(false);
                            setSelectAllGames(false);
                            setAllDiscountFormData({
                              discount_percentage: 0,
                              capital_price: 0,
                              selling_price: 0
                            });
                          }}
                          className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors text-sm font-medium"
                        >
                          Cancel All
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                        <div>
                          <label className="block text-xs md:text-sm font-medium text-gray-900 mb-2">Discount Percentage (%)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={allDiscountFormData.discount_percentage}
                            onChange={(e) => {
                              setAllDiscountFormData(prev => ({
                                ...prev,
                                discount_percentage: parseFloat(e.target.value) || 0
                              }));
                            }}
                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 md:px-4 md:py-2 text-gray-900 text-sm md:text-base"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs md:text-sm font-medium text-gray-900 mb-2">Capital Price (₱)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={allDiscountFormData.capital_price}
                            onChange={(e) => {
                              setAllDiscountFormData(prev => ({
                                ...prev,
                                capital_price: parseFloat(e.target.value) || 0
                              }));
                            }}
                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 md:px-4 md:py-2 text-gray-900 text-sm md:text-base"
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <label className="block text-xs md:text-sm font-medium text-gray-900 mb-2">Selling Price (₱)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={allDiscountFormData.selling_price}
                            onChange={(e) => {
                              setAllDiscountFormData(prev => ({
                                ...prev,
                                selling_price: parseFloat(e.target.value) || 0
                              }));
                            }}
                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 md:px-4 md:py-2 text-gray-900 text-sm md:text-base"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      <div className="mt-4 flex justify-end gap-3">
                        <button
                          onClick={async () => {
                            // Apply to all resellers or all members (only active ones)
                            // Resellers = only resellers, Members = only end users (not resellers)
                            const targetMembers = discountTarget === 'resellers' 
                              ? members.filter(m => m.user_type === 'reseller' && m.status === 'active')
                              : members.filter(m => m.user_type === 'end_user' && m.status === 'active');
                            
                            let totalSuccess = 0;
                            let totalAttempts = 0;
                            
                            if (selectAllGames) {
                              // Apply to all games for all target members
                              for (const member of targetMembers) {
                                for (const game of menuItems) {
                                  const allVariationIds = game.variations?.map(v => v.id) || [];
                                  for (const variationId of allVariationIds) {
                                    totalAttempts++;
                                    const success = await setDiscount(
                                      member.id,
                                      game.id,
                                      variationId,
                                      allDiscountFormData
                                    );
                                    if (success) totalSuccess++;
                                  }
                                }
                              }
                            } else if (selectedGame) {
                              // Apply to selected game only
                              const allVariationIds = selectedGame.variations?.map(v => v.id) || [];
                              for (const member of targetMembers) {
                                for (const variationId of allVariationIds) {
                                  totalAttempts++;
                                  const success = await setDiscount(
                                    member.id,
                                    selectedGame.id,
                                    variationId,
                                    allDiscountFormData
                                  );
                                  if (success) totalSuccess++;
                                }
                              }
                            }
                            
                            setEditingAll(false);
                            setSelectAllGames(false);
                            const memberType = discountTarget === 'resellers' ? 'resellers' : 'members';
                            const gameCount = selectAllGames ? menuItems.length : 1;
                            if (totalSuccess === totalAttempts) {
                              showNotification('success', `Discounts saved for all ${targetMembers.length} ${memberType} across ${gameCount} game(s) (${totalSuccess} discount(s))`);
                            } else {
                              showNotification('error', `Only ${totalSuccess} of ${totalAttempts} discount(s) were saved`);
                            }
                          }}
                          className="px-4 py-2.5 md:px-6 md:py-2 bg-green-600 text-white rounded-lg active:bg-green-700 hover:bg-green-700 transition-colors text-xs md:text-sm font-medium w-full md:w-auto"
                        >
                          {selectAllGames 
                            ? `Save All Games (${members.filter(m => discountTarget === 'resellers' ? m.user_type === 'reseller' : m.user_type === 'end_user').filter(m => m.status === 'active').length} ${discountTarget === 'resellers' ? 'resellers' : 'members'}, ${menuItems.length} games)`
                            : discountTarget === 'resellers' 
                              ? `Save All (${members.filter(m => m.user_type === 'reseller' && m.status === 'active').length} resellers)`
                              : `Save All (${members.filter(m => m.user_type === 'end_user' && m.status === 'active').length} members)`}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
              
              {/* Packages Table - Only show if not selecting all games */}
              {!selectAllGames && selectedGame && (
                <div className="overflow-x-auto mt-6">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-300">
                        <th className="text-left p-3 text-gray-900 font-semibold">Package Name</th>
                        <th className="text-left p-3 text-gray-900 font-semibold">Original Price</th>
                        <th className="text-left p-3 text-gray-900 font-semibold">Discount Percentage</th>
                        <th className="text-left p-3 text-gray-900 font-semibold">Capital Price</th>
                        <th className="text-left p-3 text-gray-900 font-semibold">Selling Price</th>
                        <th className="text-left p-3 text-gray-900 font-semibold">Profit</th>
                        <th className="text-left p-3 text-gray-900 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gameDiscounts.map((discount) => {
                        const isEditing = editingDiscount === discount.variation_id;
                        const formData = discountFormData[discount.variation_id] || {
                          discount_percentage: discount.discount_percentage,
                          capital_price: discount.capital_price,
                          selling_price: discount.selling_price
                        };
                        const profit = formData.selling_price - formData.capital_price;
                        const originalPrice = selectedGame.variations?.find(v => v.id === discount.variation_id)?.price || 0;

                        return (
                          <tr key={discount.variation_id} className="border-b border-gray-200">
                            <td className="p-3 text-gray-900">{discount.variation_name}</td>
                            <td className="p-3 text-gray-900">₱{originalPrice.toFixed(2)}</td>
                            <td className="p-3">
                              {isEditing ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  value={formData.discount_percentage}
                                  onChange={(e) => {
                                    setDiscountFormData(prev => ({
                                      ...prev,
                                      [discount.variation_id]: {
                                        ...formData,
                                        discount_percentage: parseFloat(e.target.value) || 0
                                      }
                                    }));
                                  }}
                                  className="w-20 bg-white border border-gray-300 rounded px-2 py-1 text-gray-900 text-sm"
                                />
                              ) : (
                                <span className="text-gray-900">{discount.discount_percentage}%</span>
                              )}
                            </td>
                            <td className="p-3">
                              {isEditing ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  value={formData.capital_price}
                                  onChange={(e) => {
                                    setDiscountFormData(prev => ({
                                      ...prev,
                                      [discount.variation_id]: {
                                        ...formData,
                                        capital_price: parseFloat(e.target.value) || 0
                                      }
                                    }));
                                  }}
                                  className="w-24 bg-white border border-gray-300 rounded px-2 py-1 text-gray-900 text-sm"
                                />
                              ) : (
                                <span className="text-gray-900">₱{discount.capital_price.toFixed(2)}</span>
                              )}
                            </td>
                            <td className="p-3">
                              {isEditing ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  value={formData.selling_price}
                                  onChange={(e) => {
                                    setDiscountFormData(prev => ({
                                      ...prev,
                                      [discount.variation_id]: {
                                        ...formData,
                                        selling_price: parseFloat(e.target.value) || 0
                                      }
                                    }));
                                  }}
                                  className="w-24 bg-white border border-gray-300 rounded px-2 py-1 text-gray-900 text-sm"
                                />
                              ) : (
                                <span className="text-gray-900">₱{discount.selling_price.toFixed(2)}</span>
                              )}
                            </td>
                            <td className="p-3">
                              <span className="text-green-600 font-semibold">
                                ₱{profit.toFixed(2)}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                {isEditing ? (
                                  <>
                                    <button
                                      onClick={() => handleSetDiscount(discount.variation_id)}
                                      className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                                      title="Save"
                                    >
                                      <Save className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingDiscount(null);
                                        setDiscountFormData(prev => {
                                          const newData = { ...prev };
                                          delete newData[discount.variation_id];
                                          return newData;
                                        });
                                      }}
                                      className="p-1.5 text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded transition-colors"
                                      title="Cancel"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => {
                                        setEditingDiscount(discount.variation_id);
                                        setDiscountFormData(prev => ({
                                          ...prev,
                                          [discount.variation_id]: {
                                            discount_percentage: discount.discount_percentage,
                                            capital_price: discount.capital_price,
                                            selling_price: discount.selling_price
                                          }
                                        }));
                                      }}
                                      className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                                      title="Edit"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (confirm('Are you sure you want to delete this discount for all selected members?')) {
                                          handleDeleteDiscount(discount.variation_id);
                                        }
                                      }}
                                      className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                      title="Delete"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
          </>
        )}
      </div>
    </div>
  );
};

export default MemberDashboard;
