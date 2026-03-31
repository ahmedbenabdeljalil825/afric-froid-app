import React from 'react';
import { motion } from 'framer-motion';

const GlobalLoader: React.FC = () => {
  return (
    <div className="fixed top-0 left-0 w-full z-50 h-1 bg-slate-100 overflow-hidden">
      <motion.div
        className="h-full bg-frost-500 shadow-lg shadow-frost-500/20"
        initial={{ width: "0%" }}
        animate={{ 
          width: ["0%", "30%", "70%", "90%"],
          transition: { 
            duration: 2,
            times: [0, 0.4, 0.8, 1],
            ease: "easeInOut"
          }
        }}
      />
    </div>
  );
};

export default GlobalLoader;
