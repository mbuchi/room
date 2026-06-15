interface CoordinateDisplayProps {
  coords: [number, number] | null;
}

const CoordinateDisplay = ({ coords }: CoordinateDisplayProps) => {
  if (!coords) return null;

  return (
    <div className="fixed bottom-2 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
      <span className="text-[10px] font-mono text-gray-600/90 dark:text-gray-300/80 bg-white/70 dark:bg-gray-900/60 px-2 py-0.5 rounded">
        E {coords[0].toFixed(2)} / N {coords[1].toFixed(2)}
      </span>
    </div>
  );
};

export default CoordinateDisplay;
