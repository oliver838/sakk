import React, { createContext, useContext, useState } from 'react';

const PumpkinContext = createContext();

export const PumpkinProvider = ({ children }) => {
  const [showPumpkins, setShowPumpkins] = useState(false);
  const [muted, setMuted] = useState(false);

  return (
    <PumpkinContext.Provider value={{ showPumpkins, setShowPumpkins, muted, setMuted }}>
      {children}
    </PumpkinContext.Provider>
  );
};

export const usePumpkins = () => {
  return useContext(PumpkinContext);
};
