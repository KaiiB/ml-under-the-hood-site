interface ImageContainerProps {
  children: any;
}

export default function ImageContainer({ children }: ImageContainerProps) {
  return (
    <div className="visualizer-card">
      <div className="visualizer-content">
        {children}
      </div>
    </div>
  );
}
