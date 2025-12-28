import { ReactNode, useState } from "react";

interface TooltipProps {
  content: string;
  children: ReactNode;
}

export function Tooltip({ content, children }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="cursor-help"
      >
        {children}
      </div>
      {isVisible && (
        <div
          className="absolute z-50 px-3 py-2 text-sm bg-secondary text-gray-200 rounded-lg shadow-lg whitespace-normal w-[500px]"
          style={{
            bottom: "100%",
            left: "50%",
            transform: "translateX(-100%)",
            marginBottom: "8px",
          }}
        >
          {content}
          <div
            className="absolute w-2 h-2 bg-secondary transform rotate-45"
            style={{
              top: "100%",
              left: "50%",
              marginLeft: "-4px",
              marginTop: "-4px",
            }}
          />
        </div>
      )}
    </div>
  );
}
