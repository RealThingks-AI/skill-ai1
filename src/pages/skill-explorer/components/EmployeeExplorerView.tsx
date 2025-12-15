import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, User } from "lucide-react";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { formatRole, getRatingColor } from "../utils/skillExplorerHelpers";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
interface ApprovedRating {
  skill_id: string;
  skill_name: string;
  subskill_id: string | null;
  subskill_name: string | null;
  rating: "high" | "low" | "medium";
  approved_at: string;
  category_id: string;
  category_name: string;
}
interface EmployeeCategory {
  category_id: string;
  category_name: string;
  ratings: ApprovedRating[];
}
interface Employee {
  user_id: string;
  full_name: string;
  role: string;
  email: string;
  categories: EmployeeCategory[];
}
interface EmployeeExplorerViewProps {
  employees: Employee[];
  loading: boolean;
}
export function EmployeeExplorerView({
  employees,
  loading
}: EmployeeExplorerViewProps) {
  if (loading) {
    return <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>;
  }
  if (employees.length === 0) {
    return <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <User className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No Employees Found</h3>
        <p className="text-muted-foreground max-w-md">
          No employees or tech leads with approved ratings found.
        </p>
      </div>;
  }
  return <Accordion type="multiple" className="space-y-2">
      {employees.map(employee => <AccordionItem key={employee.user_id} value={employee.user_id} className="border rounded-lg">
          <Card className="p-0">
            <AccordionTrigger className="px-3 py-3 hover:no-underline hover:bg-accent/50 rounded-lg">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium">{employee.full_name}</p>
                  
                </div>
                <Badge variant="secondary" className="ml-auto mr-2">
                  {employee.categories.length} categor
                  {employee.categories.length === 1 ? "y" : "ies"}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3">
              <Accordion type="multiple" className="space-y-2 mt-2">
                {employee.categories.map(category => <AccordionItem key={category.category_id} value={category.category_id} className="border rounded-md">
                    <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-accent/30 rounded-md text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span className="font-medium">{category.category_name}</span>
                        <span className="text-muted-foreground ml-2">
                          ({category.ratings.length} skill{category.ratings.length !== 1 ? "s" : ""})
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-3 pb-2">
                      <div className="space-y-2 mt-2">
                        {category.ratings.map((rating, index) => <div key={index} className="flex items-center justify-between gap-3 p-2 bg-muted/30 rounded-md">
                            <p className="text-sm font-medium">
                              {rating.subskill_name || rating.skill_name}
                              {rating.subskill_name && <span className="text-xs text-muted-foreground font-normal ml-2">
                                  ({rating.skill_name})
                                </span>}
                            </p>
                            <Badge className={cn("shrink-0 text-xs", getRatingColor(rating.rating))}>
                              {rating.rating}
                            </Badge>
                          </div>)}
                      </div>
                    </AccordionContent>
                  </AccordionItem>)}
              </Accordion>
            </AccordionContent>
          </Card>
        </AccordionItem>)}
    </Accordion>;
}