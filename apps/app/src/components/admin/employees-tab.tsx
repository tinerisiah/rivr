"use client";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const employeeFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type EmployeeFormData = z.infer<typeof employeeFormSchema>;

export function EmployeesTab({ readOnly = false }: { readOnly?: boolean }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/api/admin/employees"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/employees");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: EmployeeFormData) => {
      const res = await apiRequest("POST", "/api/admin/employees", payload);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Employee Created",
        description: "View-only employee added.",
      });
      setOpen(false);
      form.reset();
      refetch();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/employees/${id}`);
      return res.json();
    },
  });

  const employees =
    (data?.employees as Array<{ id: number; name: string; email: string }>) ||
    [];

  return (
    <Card className="bg-card border border-border p-4 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-wide">
          Employees (View Only)
        </h2>
        {!readOnly && (
          <Button
            onClick={() => setOpen(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            Add Employee
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : employees.length === 0 ? (
        <div className="text-sm text-muted-foreground">No employees yet.</div>
      ) : (
        <div className="space-y-2">
          {employees.map((emp) => (
            <div
              key={emp.id}
              className="flex items-center justify-between border rounded p-3"
            >
              <div>
                <div className="font-medium text-foreground">{emp.name}</div>
                <div className="text-sm text-muted-foreground">{emp.email}</div>
              </div>
              {!readOnly && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                  onClick={async () => {
                    await deleteMutation.mutateAsync(emp.id);
                    toast({ title: "Employee Deleted" });
                  }}
                >
                  Delete
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={open && !readOnly} onOpenChange={setOpen}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle>Add Employee (View Only)</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) =>
                createMutation.mutateAsync(data)
              )}
              className="space-y-3"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
