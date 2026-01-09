import React, { useState, useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { CartItem, PaymentMethod, CustomField } from '../types';
import { usePaymentMethods } from '../hooks/usePaymentMethods';

interface CheckoutProps {
  cartItems: CartItem[];
  totalPrice: number;
  onBack: () => void;
}

const Checkout: React.FC<CheckoutProps> = ({ cartItems, totalPrice, onBack }) => {
  const { paymentMethods } = usePaymentMethods();
  const [step, setStep] = useState<'details' | 'payment'>('details');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('gcash');
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});

  // Collect all unique custom fields from cart items
  // If any game has custom fields, show those. Otherwise, show default "IGN" field
  const customFields = useMemo(() => {
    const fieldMap = new Map<string, CustomField>();
    let hasAnyCustomFields = false;
    
    cartItems.forEach(item => {
      if (item.customFields && item.customFields.length > 0) {
        hasAnyCustomFields = true;
        item.customFields.forEach(field => {
          // Use key as unique identifier
          if (!fieldMap.has(field.key)) {
            fieldMap.set(field.key, field);
          }
        });
      }
    });
    
    // If no games have custom fields, return default "IGN" field
    if (!hasAnyCustomFields) {
      return [{
        label: 'IGN',
        key: 'ign',
        required: true,
        placeholder: 'In game name'
      }];
    }
    
    return Array.from(fieldMap.values());
  }, [cartItems]);

  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  // Set default payment method when payment methods are loaded
  React.useEffect(() => {
    if (paymentMethods.length > 0 && !paymentMethod) {
      setPaymentMethod((paymentMethods[0].id as PaymentMethod) || 'gcash');
    }
  }, [paymentMethods, paymentMethod]);

  const selectedPaymentMethod = paymentMethods.find(method => method.id === paymentMethod);
  
  const handleProceedToPayment = () => {
    setStep('payment');
  };

  const handlePlaceOrder = () => {
    // Build custom fields section
    const customFieldsSection = customFields.length > 0 
      ? customFields.map(field => {
          const value = customFieldValues[field.key] || '';
          return value ? `${field.label}: ${value}` : null;
        }).filter(Boolean).join('\n')
      : '';

    const orderDetails = `
🛒 AmberKin ORDER

${customFieldsSection || `🎮 IGN: ${customFieldValues['ign'] || ''}`}
${customFieldsSection ? '' : ''}
${customFieldsSection ? `\n📝 Additional Information:\n${customFieldsSection}` : ''}

📋 ORDER DETAILS:
${cartItems.map(item => {
  let itemDetails = `• ${item.name}`;
  if (item.selectedVariation) {
    itemDetails += ` (${item.selectedVariation.name})`;
  }
  if (item.selectedAddOns && item.selectedAddOns.length > 0) {
    itemDetails += ` + ${item.selectedAddOns.map(addOn => 
      addOn.quantity && addOn.quantity > 1 
        ? `${addOn.name} x${addOn.quantity}`
        : addOn.name
    ).join(', ')}`;
  }
  itemDetails += ` x${item.quantity} - ₱${item.totalPrice * item.quantity}`;
  return itemDetails;
}).join('\n')}

💰 TOTAL: ₱${totalPrice}

💳 Payment: ${selectedPaymentMethod?.name || paymentMethod}
📸 Payment Screenshot: Please attach your payment receipt screenshot

Please confirm this order to proceed. Thank you for choosing AmberKin! 🎮
    `.trim();

    const encodedMessage = encodeURIComponent(orderDetails);
    const messengerUrl = `https://m.me/AmberKinGamerXtream?text=${encodedMessage}`;
    
    window.open(messengerUrl, '_blank');
    
  };

  const isDetailsValid = customFields.every(field => 
    !field.required || customFieldValues[field.key]?.trim()
  );

  if (step === 'details') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center mb-8">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-cafe-textMuted hover:text-cafe-primary transition-colors duration-200"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Cart</span>
          </button>
          <h1 className="text-3xl font-semibold text-cafe-text ml-8">Order Details</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Customer Details Form */}
          <div className="glass-card rounded-xl p-6">
            <h2 className="text-2xl font-medium text-cafe-text mb-6">Customer Information</h2>
            
            <form className="space-y-6">
              {/* Dynamic Custom Fields */}
              {customFields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-cafe-text mb-2">
                    {field.label} {field.required && '*'}
                  </label>
                  <input
                    type="text"
                    value={customFieldValues[field.key] || ''}
                    onChange={(e) => setCustomFieldValues({
                      ...customFieldValues,
                      [field.key]: e.target.value
                    })}
                    className="w-full px-4 py-3 glass border border-cafe-primary/30 rounded-lg focus:ring-2 focus:ring-cafe-primary focus:border-cafe-primary transition-all duration-200 text-cafe-text placeholder-cafe-textMuted"
                    placeholder={field.placeholder || field.label}
                    required={field.required}
                  />
                </div>
              ))}

              <button
                onClick={handleProceedToPayment}
                disabled={!isDetailsValid}
                className={`w-full py-4 rounded-xl font-medium text-lg transition-all duration-200 transform ${
                  isDetailsValid
                    ? 'text-white hover:opacity-90 hover:scale-[1.02]'
                    : 'glass text-cafe-textMuted cursor-not-allowed'
                }`}
                style={isDetailsValid ? { backgroundColor: '#1E7ACB' } : {}}
              >
                Proceed to Payment
              </button>
            </form>
          </div>

          {/* Order Summary */}
          <div className="glass-card rounded-xl p-6">
            <h2 className="text-2xl font-medium text-cafe-text mb-6">Order Summary</h2>
            
            <div className="space-y-4 mb-6">
              {cartItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-cafe-primary/30">
                  <div>
                    <h4 className="font-medium text-cafe-text">{item.name}</h4>
                    {item.selectedVariation && (
                      <p className="text-sm text-cafe-textMuted">Package: {item.selectedVariation.name}</p>
                    )}
                    {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                      <p className="text-sm text-cafe-textMuted">
                        Add-ons: {item.selectedAddOns.map(addOn => addOn.name).join(', ')}
                      </p>
                    )}
                    <p className="text-sm text-cafe-textMuted">₱{item.totalPrice} x {item.quantity}</p>
                  </div>
                  <span className="font-semibold text-cafe-text">₱{item.totalPrice * item.quantity}</span>
                </div>
              ))}
            </div>
            
            <div className="border-t border-cafe-primary/30 pt-4">
              <div className="flex items-center justify-between text-2xl font-semibold text-cafe-text">
                <span>Total:</span>
                <span className="text-white">₱{totalPrice}</span>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    );
  }

  // Payment Step
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center mb-8">
        <button
          onClick={() => setStep('details')}
          className="flex items-center space-x-2 text-cafe-textMuted hover:text-cafe-primary transition-colors duration-200"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Details</span>
        </button>
        <h1 className="text-3xl font-semibold text-cafe-text ml-8">Payment</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Payment Method Selection */}
        <div className="glass-card rounded-xl p-6">
          <h2 className="text-2xl font-medium text-cafe-text mb-6">Choose Payment Method</h2>
          
          <div className="grid grid-cols-1 gap-4 mb-6">
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                type="button"
                onClick={() => setPaymentMethod(method.id as PaymentMethod)}
                className={`p-4 rounded-lg border-2 transition-all duration-200 flex items-center space-x-3 ${
                  paymentMethod === method.id
                    ? 'border-transparent text-white'
                    : 'glass border-cafe-primary/30 text-cafe-text hover:border-cafe-primary hover:glass-strong'
                }`}
                style={paymentMethod === method.id ? { backgroundColor: '#1E7ACB' } : {}}
              >
                <span className="text-2xl">💳</span>
                <span className="font-medium">{method.name}</span>
              </button>
            ))}
          </div>

          {/* Payment Details with QR Code */}
          {selectedPaymentMethod && (
            <div className="glass-strong rounded-lg p-6 mb-6 border border-cafe-primary/30">
              <h3 className="font-medium text-cafe-text mb-4">Payment Details</h3>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm text-cafe-textMuted mb-1">{selectedPaymentMethod.name}</p>
                  <p className="font-mono text-cafe-text font-medium">{selectedPaymentMethod.account_number}</p>
                  <p className="text-sm text-cafe-textMuted mb-3">Account Name: {selectedPaymentMethod.account_name}</p>
                  <p className="text-xl font-semibold text-white">Amount: ₱{totalPrice}</p>
                </div>
                <div className="flex-shrink-0">
                  <img 
                    src={selectedPaymentMethod.qr_code_url} 
                    alt={`${selectedPaymentMethod.name} QR Code`}
                    className="w-32 h-32 rounded-lg border-2 border-cafe-primary/30 shadow-sm"
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.pexels.com/photos/8867482/pexels-photo-8867482.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop';
                    }}
                  />
                  <p className="text-xs text-cafe-textMuted text-center mt-2">Scan to pay</p>
                </div>
              </div>
            </div>
          )}

          {/* Payment instructions */}
          <div className="glass border border-cafe-primary/30 rounded-lg p-4">
            <h4 className="font-medium text-cafe-text mb-2">📸 Payment Proof Required</h4>
            <p className="text-sm text-cafe-textMuted">
              After making your payment, please take a screenshot of your payment receipt and attach it when you send your order via Messenger. This helps us verify and process your order quickly.
            </p>
          </div>
        </div>

        {/* Order Summary */}
        <div className="glass-card rounded-xl p-6">
          <h2 className="text-2xl font-medium text-cafe-text mb-6">Final Order Summary</h2>
          
          <div className="space-y-4 mb-6">
            <div className="glass-strong rounded-lg p-4 border border-cafe-primary/30">
              <h4 className="font-medium text-cafe-text mb-2">Customer Details</h4>
              {customFields.map(field => {
                const value = customFieldValues[field.key];
                return value ? (
                  <p key={field.key} className="text-sm text-cafe-textMuted">
                    {field.label}: {value}
                  </p>
                ) : null;
              })}
            </div>

            {cartItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2 border-b border-cafe-primary/30">
                <div>
                  <h4 className="font-medium text-cafe-text">{item.name}</h4>
                  {item.selectedVariation && (
                    <p className="text-sm text-cafe-textMuted">Package: {item.selectedVariation.name}</p>
                  )}
                  {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                    <p className="text-sm text-cafe-textMuted">
                      Add-ons: {item.selectedAddOns.map(addOn => 
                        addOn.quantity && addOn.quantity > 1 
                          ? `${addOn.name} x${addOn.quantity}`
                          : addOn.name
                      ).join(', ')}
                    </p>
                  )}
                  <p className="text-sm text-cafe-textMuted">₱{item.totalPrice} x {item.quantity}</p>
                </div>
                <span className="font-semibold text-cafe-text">₱{item.totalPrice * item.quantity}</span>
              </div>
            ))}
          </div>
          
          <div className="border-t border-cafe-primary/30 pt-4 mb-6">
            <div className="flex items-center justify-between text-2xl font-semibold text-cafe-text">
              <span>Total:</span>
              <span className="text-white">₱{totalPrice}</span>
            </div>
          </div>

          <button
            onClick={handlePlaceOrder}
            className="w-full py-4 rounded-xl font-medium text-lg transition-all duration-200 transform text-white hover:opacity-90 hover:scale-[1.02]"
            style={{ backgroundColor: '#1E7ACB' }}
          >
            Place Order via Messenger
          </button>
          
          <p className="text-xs text-cafe-textMuted text-center mt-3">
            You'll be redirected to Facebook Messenger to confirm your order. Don't forget to attach your payment screenshot!
          </p>
        </div>
      </div>
    </div>
  );
};

export default Checkout;