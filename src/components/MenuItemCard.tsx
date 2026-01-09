import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { MenuItem, Variation } from '../types';

interface MenuItemCardProps {
  item: MenuItem;
  onAddToCart: (item: MenuItem, quantity?: number, variation?: Variation) => void;
  quantity: number;
  onUpdateQuantity: (id: string, quantity: number) => void;
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({ 
  item, 
  onAddToCart, 
  quantity, 
  onUpdateQuantity 
}) => {
  const [showCustomization, setShowCustomization] = useState(false);
  const [selectedVariation, setSelectedVariation] = useState<Variation | undefined>(
    item.variations?.[0]
  );
  const nameRef = useRef<HTMLHeadingElement>(null);
  const [shouldScroll, setShouldScroll] = useState(false);
  // Calculate discounted price for a variation/currency package
  const getDiscountedPrice = (basePrice: number): number => {
    if (item.isOnDiscount && item.discountPercentage !== undefined) {
      const discountAmount = (basePrice * item.discountPercentage) / 100;
      return basePrice - discountAmount;
    }
    return basePrice;
  };

  const handleCardClick = () => {
    if (!item.available) return;
    setShowCustomization(true);
  };

  const handleItemSelect = (variation?: Variation) => {
    onAddToCart(item, 1, variation || selectedVariation);
    setShowCustomization(false);
    setSelectedVariation(item.variations?.[0]);
  };

  // Check if text overflows and needs scrolling
  useEffect(() => {
    const checkOverflow = () => {
      if (!nameRef.current) return;
      
      const element = nameRef.current;
      const isOverflowing = element.scrollWidth > element.clientWidth;
      setShouldScroll(isOverflowing);
    };

    // Use setTimeout to ensure DOM is fully rendered
    const timeoutId = setTimeout(() => {
      checkOverflow();
    }, 100);

    window.addEventListener('resize', checkOverflow);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', checkOverflow);
    };
  }, [item.name]);

  return (
    <>
      <div 
        onClick={handleCardClick}
        className={`flex flex-row items-center transition-all duration-300 group rounded-xl p-3 gap-3 ${!item.available ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
        style={{
          background: '#1E7ACB',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}
        onMouseEnter={(e) => {
          if (item.available) {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
            e.currentTarget.style.backdropFilter = 'blur(16px)';
            e.currentTarget.style.webkitBackdropFilter = 'blur(16px)';
            e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.3)';
            e.currentTarget.style.boxShadow = '0 8px 32px 0 rgba(0, 0, 0, 0.37)';
          }
        }}
        onMouseLeave={(e) => {
          if (item.available) {
            e.currentTarget.style.background = '#1E7ACB';
            e.currentTarget.style.backdropFilter = 'none';
            e.currentTarget.style.webkitBackdropFilter = 'none';
            e.currentTarget.style.border = 'none';
            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
          }
        }}
      >
        {/* Square Game Icon on Left */}
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-cafe-darkCard to-cafe-darkBg transition-transform duration-300 group-hover:scale-105">
          {item.image ? (
            <img
              src={item.image}
              alt={item.name}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div className={`absolute inset-0 flex items-center justify-center ${item.image ? 'hidden' : ''}`}>
            <div className="text-4xl opacity-20 text-gray-400">🎮</div>
          </div>
        </div>
        
        {/* Game Name and Info on Right */}
        <div className="flex-1 overflow-hidden min-w-0">
          <h4 
            ref={nameRef}
            className={`text-white font-bold whitespace-nowrap text-base sm:text-lg mb-1 ${
              shouldScroll ? 'animate-scroll-text' : ''
            }`}
            style={shouldScroll ? {
              display: 'inline-block',
            } : {}}
          >
            {shouldScroll ? (
              <>
                <span>{item.name}</span>
                <span className="mx-4">•</span>
                <span>{item.name}</span>
              </>
            ) : (
              item.name
            )}
          </h4>
          {item.variations && item.variations.length > 0 && (
            <p className="text-xs sm:text-sm text-gray-300">
              {item.variations.length} package{item.variations.length > 1 ? 's' : ''} available
            </p>
          )}
        </div>
      </div>

      {/* Item Selection Modal */}
      {showCustomization && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowCustomization(false)}>
          <div className="rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" style={{ background: '#0066CC' }} onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 p-6 flex items-center justify-between rounded-t-2xl" style={{ background: '#3399FF' }}>
              <div>
                <h3 className="text-xl font-bold text-white">{item.name}</h3>
                <p className="text-sm text-white/80 mt-1">Select an item to add to cart</p>
              </div>
              <button
                onClick={() => setShowCustomization(false)}
                className="p-2 hover:bg-white/20 rounded-full transition-colors duration-200"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>

            <div className="p-6" style={{ background: '#0066CC' }}>
              {/* Show currency packages as selectable items in grid */}
              {item.variations && item.variations.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {item.variations.map((variation) => {
                    const originalPrice = variation.price;
                    const discountedPrice = getDiscountedPrice(originalPrice);
                    const isDiscounted = item.isOnDiscount && item.discountPercentage !== undefined;
                    
                    return (
                      <button
                        key={variation.id}
                        onClick={() => handleItemSelect(variation)}
                        className="bg-white rounded-lg p-3 text-left group shadow-md relative overflow-hidden package-card-hover"
                        style={{
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                        }}
                      >
                        <div className="flex flex-col">
                          <div className="font-semibold text-gray-900 text-sm mb-1">
                            {variation.name}
                          </div>
                          {variation.description && (
                            <div className="text-xs text-gray-600 mb-2 line-clamp-2">
                              {variation.description}
                            </div>
                          )}
                          <div className="mt-auto">
                            <div className="text-base font-bold text-gray-900">
                              ₱{discountedPrice.toFixed(2)}
                            </div>
                            {isDiscounted && (
                              <div className="flex items-center gap-2 mt-1">
                                <div className="text-xs text-gray-500 line-through">
                                  ₱{originalPrice.toFixed(2)}
                                </div>
                                <div className="text-xs text-gray-900 font-semibold">
                                  -{item.discountPercentage}%
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-white/80">
                  No currency packages available
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MenuItemCard;