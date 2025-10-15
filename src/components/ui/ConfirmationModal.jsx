import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Confirm", 
  cancelText = "Cancel",
  type = "confirm", // 'confirm', 'cancel', 'warning'
  bookingDetails = null 
}) => {
  if (!isOpen) return null;

  const getIconAndColor = () => {
    switch (type) {
      case 'confirm':
        return { 
          icon: CheckCircle, 
          color: 'text-green-600', 
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      case 'cancel':
        return { 
          icon: X, 
          color: 'text-red-600', 
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      case 'warning':
        return { 
          icon: AlertTriangle, 
          color: 'text-yellow-600', 
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200'
        };
      default:
        return { 
          icon: CheckCircle, 
          color: 'text-blue-600', 
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        };
    }
  };

  const { icon: Icon, color, bgColor, borderColor } = getIconAndColor();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />
        
        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.3 }}
          className="relative w-full max-w-lg max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <Card className="border-0 shadow-2xl flex flex-col max-h-[90vh]">
            <CardContent className="p-0 flex flex-col max-h-[90vh]">
              {/* Compact Header - Fixed at top */}
              <div className={`${bgColor} ${borderColor} border-b px-4 py-3 rounded-t-lg flex-shrink-0`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`p-1.5 rounded-full ${bgColor} ${borderColor} border`}>
                      <Icon className={`h-5 w-5 ${color}`} />
                    </div>
                    <h3 className="text-base font-semibold text-gray-900">{title}</h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="h-7 w-7 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Scrollable Content Area */}
              <div className="px-4 py-3 overflow-y-auto flex-1">
                <p className="text-gray-700 mb-2 text-sm">{message}</p>
                
                {/* Optional custom content area (e.g., deposit form) */}
                {bookingDetails?.extraContent && (
                  <div>
                    {typeof bookingDetails.extraContent === 'function' 
                      ? bookingDetails.extraContent() 
                      : bookingDetails.extraContent}
                  </div>
                )}
              </div>

              {/* Action Buttons - Fixed at bottom */}
              <div className="px-4 py-3 border-t bg-white rounded-b-lg flex-shrink-0">
                <div className="flex space-x-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="px-4 py-2 text-sm"
                  >
                    {cancelText}
                  </Button>
                  <Button
                    onClick={onConfirm}
                    className={`px-4 py-2 text-sm ${
                      type === 'confirm' 
                        ? 'bg-green-600 hover:bg-green-700 text-white' 
                        : type === 'cancel'
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                    }`}
                  >
                    {confirmText}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ConfirmationModal;
