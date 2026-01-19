import React, { useState, useEffect } from 'react';
import { X, LogOut, History, User, ArrowLeft } from 'lucide-react';
import { useMemberAuth } from '../hooks/useMemberAuth';
import { supabase } from '../lib/supabase';
import { Order } from '../types';

interface MemberProfileProps {
  onClose: () => void;
  onLogout: () => void;
}

const MemberProfile: React.FC<MemberProfileProps> = ({ onClose, onLogout }) => {
  const { currentMember, isReseller } = useMemberAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [showOrderHistory, setShowOrderHistory] = useState(false);

  useEffect(() => {
    if (currentMember) {
      fetchMemberOrders();
    }
  }, [currentMember]);

  const fetchMemberOrders = async () => {
    try {
      setLoadingOrders(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('member_id', currentMember?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data as Order[]);
    } catch (err) {
      console.error('Error fetching member orders:', err);
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleLogout = () => {
    onLogout();
    onClose();
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
      return 'bg-green-500/20 text-green-300';
    } else if (displayStatus === 'rejected') {
      return 'bg-red-500/20 text-red-300';
    } else if (displayStatus === 'processing') {
      return 'bg-yellow-500/20 text-yellow-300';
    } else {
      return 'bg-gray-500/20 text-gray-300';
    }
  };

  if (!currentMember) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/20">
          <h2 className="text-xl font-bold text-cafe-text">Profile</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-cafe-text" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!showOrderHistory ? (
            <>
              {/* User Info */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-cafe-primary to-cafe-secondary rounded-full mb-4">
                  <User className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-cafe-text mb-2">
                  {currentMember.username}
                </h3>
                <p className="text-cafe-text/70 capitalize">
                  {isReseller() ? 'Reseller' : 'Member'}
                </p>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={() => setShowOrderHistory(true)}
                  className="w-full flex items-center space-x-3 p-4 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-left"
                >
                  <History className="h-5 w-5 text-cafe-primary" />
                  <div className="flex-1">
                    <p className="font-semibold text-cafe-text">Order History</p>
                    <p className="text-sm text-cafe-text/70">{orders.length} order(s)</p>
                  </div>
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-3 p-4 bg-red-500/30 hover:bg-red-500/40 rounded-lg transition-colors text-left"
                >
                  <LogOut className="h-5 w-5 text-red-400" />
                  <div className="flex-1">
                    <p className="font-semibold text-red-400">Logout</p>
                    <p className="text-sm text-red-400/70">Sign out of your account</p>
                  </div>
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Order History */}
              <div className="mb-4">
                <button
                  onClick={() => setShowOrderHistory(false)}
                  className="flex items-center space-x-2 text-cafe-text/70 hover:text-cafe-text transition-colors mb-4"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Profile</span>
                </button>
                <h3 className="text-xl font-bold text-cafe-text">Order History</h3>
              </div>

              {loadingOrders ? (
                <div className="text-center text-cafe-text/70 py-8">Loading orders...</div>
              ) : orders.length === 0 ? (
                <div className="text-center text-cafe-text/70 py-8">No orders found.</div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div key={order.id} className="bg-white/10 rounded-lg p-4 border border-white/20">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-mono text-sm text-cafe-text mb-1">#{order.id.slice(0, 8)}</p>
                          <p className="text-xs text-cafe-text/70">{new Date(order.created_at).toLocaleString()}</p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold flex-shrink-0 ml-2 ${getOrderStatusClass(order)}`}
                        >
                          {getOrderStatus(order)}
                        </span>
                      </div>
                      <div className="space-y-2 pt-3 border-t border-white/20">
                        <div className="flex justify-between text-sm">
                          <span className="text-cafe-text/70">Items:</span>
                          <span className="text-cafe-text font-medium">{Array.isArray(order.order_items) ? order.order_items.length : 0} item(s)</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-cafe-text/70">Payment:</span>
                          <span className="text-cafe-text">{order.payment_method_id || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between text-sm pt-2 border-t border-white/20">
                          <span className="text-cafe-text/70 font-medium">Total:</span>
                          <span className="text-cafe-text font-bold text-lg">₱{order.total_price.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemberProfile;
