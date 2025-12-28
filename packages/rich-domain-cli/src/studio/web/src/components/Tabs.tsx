import { TabState } from "../interfaces";

interface TabsProps {
  tabs: TabState[];
  activeTabId: string;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onNewTab: () => void;
}

export default function Tabs({
  tabs,
  activeTabId,
  onTabClick,
  onTabClose,
  onNewTab,
}: TabsProps) {
  return (
    <div className="bg-gray-800 border-b border-gray-700 flex items-center overflow-x-auto">
      {/* Tab List */}
      <div className="flex items-center flex-1 min-w-0">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              className={`
                group flex items-center gap-2 px-4 py-2 border-r border-gray-700
                min-w-[120px] max-w-[200px] cursor-pointer transition-colors
                ${
                  isActive
                    ? "bg-gray-900 text-gray-100"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300"
                }
              `}
              onClick={() => onTabClick(tab.id)}
            >
              {/* Tab Label */}
              <span className="flex-1 truncate text-sm">{tab.label}</span>

              {/* Close Button */}
              {tabs.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTabClose(tab.id);
                  }}
                  className={`
                    flex-shrink-0 w-4 h-4 flex items-center justify-center
                    rounded hover:bg-gray-600 transition-colors
                    ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}
                  `}
                  title="Close tab"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    className="w-3 h-3"
                  >
                    <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                  </svg>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* New Tab Button */}
      <button
        onClick={onNewTab}
        className="flex-shrink-0 px-3 py-2 text-gray-400 hover:text-gray-100 hover:bg-gray-700 transition-colors"
        title="New tab (Ctrl+T)"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          className="w-4 h-4"
        >
          <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
        </svg>
      </button>
    </div>
  );
}
