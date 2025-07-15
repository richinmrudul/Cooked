import React from 'react';

interface MealForComparison {
  id: string;
  title: string;
  photo_url?: string;
}

interface ComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompare: (betterMealId: string | null) => void; // null if equal
  newMeal: MealForComparison;
  comparedMeal: MealForComparison;
}

const ComparisonModal: React.FC<ComparisonModalProps> = ({
  isOpen,
  onClose,
  onCompare,
  newMeal,
  comparedMeal,
}) => {
  if (!isOpen) return null;

  const modalStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1001, // Higher than RatingModal
  };

  const contentStyle: React.CSSProperties = {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '8px',
    boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
    textAlign: 'center',
    maxWidth: '700px',
    width: '90%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  };

  const mealContainerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-around',
    gap: '20px',
    marginTop: '20px',
    width: '100%',
  };

  const mealCardStyle: React.CSSProperties = {
    flex: 1,
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '15px',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  };

  const mealImageStyle: React.CSSProperties = {
    width: '120px',
    height: '120px',
    objectFit: 'cover',
    borderRadius: '4px',
    marginBottom: '10px',
  };

  const selectButtonStyle: React.CSSProperties = {
    padding: '10px 20px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    marginTop: '15px',
  };

  const equalButtonStyle: React.CSSProperties = {
    padding: '10px 20px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    marginTop: '20px',
  };

  return (
    <div style={modalStyle} onClick={onClose}>
      <div style={contentStyle} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginBottom: '10px' }}>Which is better?</h3>
        <p style={{ color: '#555' }}>Select the meal you prefer more:</p>
        <div style={mealContainerStyle}>
          <div
            style={mealCardStyle}
            onClick={() => onCompare(newMeal.id)}
          >
            {newMeal.photo_url && <img src={newMeal.photo_url} alt={newMeal.title} style={mealImageStyle} />}
            <p style={{ fontWeight: 'bold' }}>{newMeal.title}</p>
            <button style={selectButtonStyle}>Select This</button>
          </div>
          <div
            style={mealCardStyle}
            onClick={() => onCompare(comparedMeal.id)}
          >
            {comparedMeal.photo_url && <img src={comparedMeal.photo_url} alt={comparedMeal.title} style={mealImageStyle} />}
            <p style={{ fontWeight: 'bold' }}>{comparedMeal.title}</p>
            <button style={selectButtonStyle}>Select This</button>
          </div>
        </div>
        <button
          style={equalButtonStyle}
          onClick={() => onCompare(null)}
        >
          They're Equal
        </button>
      </div>
    </div>
  );
};

export default ComparisonModal;