import { useMemo, useState } from "react";
import { AttendanceManager } from "@/components/hr/AttendanceManager";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

const Attendance = () => {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [date, setDate] = useState(today);
  const selected = useMemo(() => new Date(`${date}T00:00:00`), [date]);

  return (
    <div className="p-8 space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white">Attendance</h1>
          <p className="text-construction-concrete">Daily workforce attendance</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-construction-concrete text-sm">Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[220px] justify-start text-left font-normal bg-construction-dark border-construction-steel text-white",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selected, "PPP")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selected}
                onSelect={(d) => {
                  if (!d) return;
                  setDate(d.toISOString().slice(0, 10));
                }}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <AttendanceManager date={date} />
    </div>
  );
};

export default Attendance;
