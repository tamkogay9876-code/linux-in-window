import React from 'react';
import { Desktop } from './components/Desktop';

export const App: React.FC = () => {
  return (
    <div className="w-screen h-screen overflow-hidden select-none bg-black">
      <Desktop />
    </div>
  );
};

export default App;
