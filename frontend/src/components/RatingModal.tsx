import React from 'react';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRate: (rating: number) => void;
  mealTitle: string;
}

const RatingModal: React.FC<RatingModalProps> = ({ isOpen, onClose, onRate, mealTitle }) => {
  if (!isOpen) return null;

  const modalStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  };

  const contentStyle: React.CSSProperties = {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '8px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
    textAlign: 'center',
    maxWidth: '400px',
    width: '90%',
  };

  const buttonContainerStyle: React.CSSProperties = {
    marginTop: '20px',
    display: 'flex',
    justifyContent: 'space-around',
    gap: '10px',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '1em',
    color: 'white',
  };

  return (
    <div style={modalStyle} onClick={onClose}>
      <div style={contentStyle} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginBottom: '20px' }}>How was "{mealTitle}"?</h3>
        <p>Your quick rating helps us understand your preferences!</p>
        <div style={buttonContainerStyle}>
          <button
            style={{ ...buttonStyle, backgroundColor: '#28a745' }} // Good (5)
            onClick={() => onRate(5)}
          >
            Good
          </button>
          <button
            style={{ ...buttonStyle, backgroundColor: '#ffc107', color: '#333' }} // Okay (3)
            onClick={() => onRate(3)}
          >
            Okay
          </button>
          <button
            style={{ ...buttonStyle, backgroundColor: '#dc3545' }} // Bad (1)
            onClick={() => onRate(1)}
          >
            Bad
          </button>
        </div>
      </div>
    </div>
  );
};

export default RatingModal;