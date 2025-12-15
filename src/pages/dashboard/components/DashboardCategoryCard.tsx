import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface DashboardCategory {
  id: string;
  name: string;
  description?: string;
}

interface ClassificationData {
  expertUsers: any[];
  intermediateUsers: any[];
  beginnerUsers: any[];
}

interface DashboardCategoryCardProps {
  category: DashboardCategory;
  classifications: ClassificationData;
  onClassificationClick: (classification: 'expert' | 'intermediate' | 'beginner') => void;
  index: number;
}

export const DashboardCategoryCard = React.forwardRef<HTMLDivElement, DashboardCategoryCardProps>(({
  category,
  classifications,
  onClassificationClick,
  index,
}, ref) => {
  const getClassificationStyles = (classification: string) => {
    switch (classification) {
      case 'expert':
        return {
          text: 'text-emerald-600 dark:text-emerald-400',
          bg: 'bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100/50 dark:hover:bg-emerald-950/30',
          border: 'border-emerald-200/50 dark:border-emerald-800/50',
          label: 'Expert'
        };
      case 'intermediate':
        return {
          text: 'text-blue-600 dark:text-blue-400',
          bg: 'bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/50 dark:hover:bg-blue-950/30',
          border: 'border-blue-200/50 dark:border-blue-800/50',
          label: 'Intermediate'
        };
      case 'beginner':
        return {
          text: 'text-amber-600 dark:text-amber-400',
          bg: 'bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100/50 dark:hover:bg-amber-950/30',
          border: 'border-amber-200/50 dark:border-amber-800/50',
          label: 'Beginner'
        };
      default:
        return {
          text: 'text-foreground',
          bg: 'bg-muted/50',
          border: 'border-border',
          label: classification
        };
    }
  };

  return (
    <motion.div 
      ref={ref} 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -20, scale: 0.95 }} 
      transition={{
        duration: 0.2,
        delay: Math.min(index * 0.05, 0.3),
        ease: "easeOut"
      }}
    >
      <Card className="relative h-full w-full border border-border/50 bg-card hover:shadow-lg transition-all duration-300">
        <CardHeader className="pb-3 px-6 pt-6">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">
              {category.name}
            </h3>
            
            {category.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {category.description}
              </p>
            )}
          </div>
        </CardHeader>

        <CardContent className="px-6 pb-6 pt-0">
          <div className="grid grid-cols-3 gap-3">
            {/* Expert */}
            <motion.div
              className={`flex flex-col items-center justify-center p-4 rounded-lg border cursor-pointer transition-all ${getClassificationStyles('expert').bg} ${getClassificationStyles('expert').border}`}
              whileHover={{ scale: 1.02, y: -2 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => {
                e.stopPropagation();
                onClassificationClick('expert');
              }}
            >
              <div className={`text-3xl font-bold ${getClassificationStyles('expert').text}`}>
                {classifications.expertUsers.length}
              </div>
              <div className={`text-xs font-medium ${getClassificationStyles('expert').text} mt-1`}>
                Expert
              </div>
            </motion.div>

            {/* Intermediate */}
            <motion.div
              className={`flex flex-col items-center justify-center p-4 rounded-lg border cursor-pointer transition-all ${getClassificationStyles('intermediate').bg} ${getClassificationStyles('intermediate').border}`}
              whileHover={{ scale: 1.02, y: -2 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => {
                e.stopPropagation();
                onClassificationClick('intermediate');
              }}
            >
              <div className={`text-3xl font-bold ${getClassificationStyles('intermediate').text}`}>
                {classifications.intermediateUsers.length}
              </div>
              <div className={`text-xs font-medium ${getClassificationStyles('intermediate').text} mt-1`}>
                Intermediate
              </div>
            </motion.div>

            {/* Beginner */}
            <motion.div
              className={`flex flex-col items-center justify-center p-4 rounded-lg border cursor-pointer transition-all ${getClassificationStyles('beginner').bg} ${getClassificationStyles('beginner').border}`}
              whileHover={{ scale: 1.02, y: -2 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => {
                e.stopPropagation();
                onClassificationClick('beginner');
              }}
            >
              <div className={`text-3xl font-bold ${getClassificationStyles('beginner').text}`}>
                {classifications.beginnerUsers.length}
              </div>
              <div className={`text-xs font-medium ${getClassificationStyles('beginner').text} mt-1`}>
                Beginner
              </div>
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});

DashboardCategoryCard.displayName = "DashboardCategoryCard";