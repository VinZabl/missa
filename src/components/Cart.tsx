import React from 'react';
import { Trash2, Plus, Minus, ArrowLeft } from 'lucide-react';
import { CartItem } from '../types';

interface CartProps {
  cartItems: CartItem[];
  updateQuantity: (id: string, quantity: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  onContinueShopping: () => void;
  onCheckout: () => void;
}

const Cart: React.FC<CartProps> = ({
  cartItems,
  updateQuantity,
  removeFromCart,
  clearCart,
  getTotalPrice,
  onContinueShopping,
  onCheckout
}) => {
  if (cartItems.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center py-16">
          <div className="mb-4 text-6xl" style={{ 
            imageRendering: 'pixelated',
            filter: 'contrast(1.2)',
            transform: 'scale(1.5)',
            display: 'inline-block'
          }}>
            🦖
          </div>
          <h2 className="text-2xl font-medium text-cafe-text mb-2">Your cart is empty</h2>
          <p className="text-cafe-textMuted mb-6">Add some currency packages to get started!</p>
          <button
            onClick={onContinueShopping}
            className="text-white px-6 py-3 rounded-full hover:opacity-90 transition-all duration-200"
            style={{ backgroundColor: '#1E7ACB' }}
          >
            Browse Games
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={onContinueShopping}
          aria-label="Back"
          className="flex items-center text-cafe-textMuted hover:text-cafe-primary transition-colors duration-200"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-3xl font-semibold text-cafe-text whitespace-nowrap">Your Cart</h1>
        <button
          onClick={clearCart}
          className="text-cafe-primary hover:text-cafe-secondary transition-colors duration-200 whitespace-nowrap"
        >
          Clear All
        </button>
      </div>

      <div className="glass-card rounded-xl overflow-hidden mb-8">
        {cartItems.map((item, index) => (
          <div key={item.id} className={`p-6 ${index !== cartItems.length - 1 ? 'border-b border-cafe-primary/30' : ''}`}>
            <div className="flex">
              <div className="flex-1">
                <h3 className="text-lg font-medium text-cafe-text mb-1">{item.name}</h3>
                {item.selectedVariation && (
                  <p className="text-sm text-cafe-textMuted mb-1">Package: {item.selectedVariation.name}</p>
                )}
                {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                  <p className="text-sm text-cafe-textMuted mb-1">
                    Add-ons: {item.selectedAddOns.map(addOn => 
                      addOn.quantity && addOn.quantity > 1 
                        ? `${addOn.name} x${addOn.quantity}`
                        : addOn.name
                    ).join(', ')}
                  </p>
                )}
                <p className="text-lg font-semibold text-cafe-text">₱{item.totalPrice} each</p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center space-x-3 glass rounded-full p-1 border border-cafe-primary/30">
                <button
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="p-2 hover:bg-cafe-primary/20 rounded-full transition-colors duration-200"
                >
                  <Minus className="h-4 w-4 text-cafe-primary" />
                </button>
                <span className="font-semibold text-cafe-text min-w-[32px] text-center">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="p-2 hover:bg-cafe-primary/20 rounded-full transition-colors duration-200"
                >
                  <Plus className="h-4 w-4 text-cafe-primary" />
                </button>
              </div>

              <div className="flex items-center space-x-4 ml-auto">
                <p className="text-lg font-semibold text-cafe-text">₱{item.totalPrice * item.quantity}</p>
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="p-2 text-cafe-primary hover:text-cafe-secondary hover:bg-cafe-primary/20 rounded-full transition-all duration-200"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center justify-between text-2xl font-semibold text-cafe-text mb-6">
          <span>Total:</span>
          <span className="text-white">₱{(getTotalPrice() || 0).toFixed(2)}</span>
        </div>
        
        <button
          onClick={onCheckout}
          className="w-full text-white py-4 rounded-xl hover:opacity-90 transition-all duration-200 transform hover:scale-[1.02] font-medium text-lg"
          style={{ backgroundColor: '#1E7ACB' }}
        >
          Proceed to Checkout
        </button>
      </div>
    </div>
  );
};

export default Cart;