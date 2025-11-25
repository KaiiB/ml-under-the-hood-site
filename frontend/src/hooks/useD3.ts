// React hook for integrating D3.js with React
// Handles D3 lifecycle (create, update, cleanup) within React components

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export function useD3(
  renderFn: (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>) => void,
  dependencies: React.DependencyList
) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (ref.current) {
      const svg = d3.select(ref.current);
      renderFn(svg);
    }
    // Cleanup function - D3 will handle most cleanup automatically
    return () => {
      if (ref.current) {
        const svg = d3.select(ref.current);
        svg.selectAll('*').remove();
      }
    };
  }, dependencies);

  return ref;
}

