import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/utils/supabasePagination";
import { useToast } from "@/hooks/use-toast";

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

export const useEmployeeExplorer = (hasAccess: boolean) => {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);

  const loadEmployees = async () => {
    if (!hasAccess) return;
    
    setLoading(true);
    try {
      // Fetch all employees and tech leads with their approved ratings
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, role, email")
        .in("role", ["employee", "tech_lead"])
        .eq("status", "active")
        .order("full_name");

      if (profilesError) throw profilesError;

      if (!profiles || profiles.length === 0) {
        setEmployees([]);
        setLoading(false);
        return;
      }

      const userIds = profiles.map((p) => p.user_id);

      // Fetch approved ratings with related data - fetch ALL in batches
      let ratings: any[] = [];
      let hasMore = true;
      let offset = 0;
      const batchSize = 1000;

      while (hasMore) {
        const { data: batch, error: ratingsError } = await supabase
          .from("employee_ratings")
          .select(`
            user_id,
            skill_id,
            subskill_id,
            rating,
            approved_at,
            skills!inner(id, name, category_id, skill_categories!inner(id, name)),
            subskills(id, name)
          `)
          .eq("status", "approved")
          .in("user_id", userIds)
          .range(offset, offset + batchSize - 1);

        if (ratingsError) throw ratingsError;

        if (batch && batch.length > 0) {
          ratings = [...ratings, ...batch];
          offset += batchSize;
          hasMore = batch.length === batchSize;
        } else {
          hasMore = false;
        }
      }

      // Group ratings by user and category
      const employeeMap = new Map<string, Employee>();

      profiles.forEach((profile) => {
        employeeMap.set(profile.user_id, {
          user_id: profile.user_id,
          full_name: profile.full_name,
          role: profile.role,
          email: profile.email,
          categories: [],
        });
      });

      ratings?.forEach((rating: any) => {
        const employee = employeeMap.get(rating.user_id);
        if (!employee) return;

        const categoryId = rating.skills.category_id;
        const categoryName = rating.skills.skill_categories.name;

        let category = employee.categories.find((c) => c.category_id === categoryId);
        if (!category) {
          category = {
            category_id: categoryId,
            category_name: categoryName,
            ratings: [],
          };
          employee.categories.push(category);
        }

        category.ratings.push({
          skill_id: rating.skill_id,
          skill_name: rating.skills.name,
          subskill_id: rating.subskill_id,
          subskill_name: rating.subskills?.name || null,
          rating: rating.rating,
          approved_at: rating.approved_at,
          category_id: categoryId,
          category_name: categoryName,
        });
      });

      // Filter out employees with no approved ratings
      const employeesWithRatings = Array.from(employeeMap.values()).filter(
        (emp) => emp.categories.length > 0
      );

      setEmployees(employeesWithRatings);
    } catch (error) {
      console.error("Error loading employees:", error);
      toast({
        title: "Error",
        description: "Failed to load employees",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasAccess) {
      loadEmployees();
    }
  }, [hasAccess]);

  return { employees, loading, loadEmployees };
};
