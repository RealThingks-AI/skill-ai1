import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface Category {
  id: string;
  name: string;
  color: string;
}

interface CategorySelectionModalProps {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  onSelectCategory: (category: Category) => void;
}

export function CategorySelectionModal({
  open,
  onClose,
  categories,
  onSelectCategory,
}: CategorySelectionModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[min(1152px,90vw)] w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">Select Skill Category</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
          {categories.map((category) => (
            <Card
              key={category.id}
              className="p-6 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all hover:scale-[1.02] bg-card"
              onClick={() => onSelectCategory(category)}
            >
              <div className="flex items-center justify-center">
                <p className="font-medium text-base text-center">{category.name}</p>
              </div>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
