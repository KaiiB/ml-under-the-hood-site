// Iteration Controls Component for navigating through K-Means steps
import React from 'react';
import './IterationControls.css';

interface IterationControlsProps {
  currentIteration: number;
  totalIterations: number;
  onIterationChange: (iteration: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  onFirst: () => void;
  onLast: () => void;
  isConverged: boolean;
}

const IterationControls: React.FC<IterationControlsProps> = ({
  currentIteration,
  totalIterations,
  onIterationChange,
  onPrevious,
  onNext,
  onFirst,
  onLast,
  isConverged,
}) => {
  return (
    <div className="iteration-controls">
      <button
        className="btn btn-secondary"
        onClick={onFirst}
        disabled={currentIteration === 0}
        title="First Iteration"
      >
        ⏮ First
      </button>
      <button
        className="btn btn-secondary"
        onClick={onPrevious}
        disabled={currentIteration === 0}
        title="Previous Iteration"
      >
        ⏪ Prev
      </button>

      <div className="iteration-info">
        <span style={{ minWidth: '100px', fontSize: '0.875rem', fontWeight: '600' }}>
          Iteration {currentIteration} / {totalIterations}
        </span>
        <input
          type="range"
          min="0"
          max={totalIterations}
          value={currentIteration}
          onChange={(e) => onIterationChange(parseInt(e.target.value))}
          className="iteration-slider"
        />
        {isConverged && (
          <span
            style={{
              fontSize: '0.75rem',
              color: 'var(--success)',
              fontWeight: '600',
              marginLeft: 'var(--spacing-sm)',
            }}
          >
            ✓ Converged
          </span>
        )}
      </div>

      <button
        className="btn btn-secondary"
        onClick={onNext}
        disabled={currentIteration >= totalIterations}
        title="Next Iteration"
      >
        Next ⏩
      </button>
      <button
        className="btn btn-secondary"
        onClick={onLast}
        disabled={currentIteration >= totalIterations}
        title="Last Iteration"
      >
        Last ⏭
      </button>
    </div>
  );
};

export default IterationControls;

