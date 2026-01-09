import React from 'react';
import { useCategories } from '../hooks/useCategories';

interface SubNavProps {
  selectedCategory: string;
  onCategoryClick: (categoryId: string) => void;
}

const SubNav: React.FC<SubNavProps> = ({ selectedCategory, onCategoryClick }) => {
  const { categories, loading } = useCategories();

  return (
    <div className="sticky top-16 z-40" style={{ 
      background: 'transparent',
      border: 'none'
    }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center space-x-4 overflow-x-auto scrollbar-hide flex-nowrap">
          {loading ? (
            <div className="flex space-x-4 flex-nowrap">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-8 w-20 glass rounded animate-pulse flex-shrink-0" />
              ))}
            </div>
          ) : (
            <>
              <button
                onClick={() => onCategoryClick('all')}
                className={`px-3 py-1.5 rounded-full text-sm transition-all duration-200 border flex-shrink-0 whitespace-nowrap ${
                  selectedCategory === 'all'
                    ? 'text-white border-transparent'
                    : 'bg-transparent text-cafe-text border-cafe-primary/30 hover:border-cafe-primary hover:bg-white/50'
                }`}
                style={selectedCategory === 'all' ? { backgroundColor: '#1E7ACB' } : {}}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onCategoryClick(c.id)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-all duration-200 border flex-shrink-0 whitespace-nowrap ${
                    selectedCategory === c.id
                      ? 'text-white border-transparent'
                      : 'bg-transparent text-cafe-text border-cafe-primary/30 hover:border-cafe-primary hover:bg-white/50'
                  }`}
                  style={selectedCategory === c.id ? { backgroundColor: '#1E7ACB' } : {}}
                >
                  {c.name}
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubNav;


