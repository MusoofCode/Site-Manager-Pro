import { useMemo, useState } from "react";
import { AttendanceManager } from "@/components/hr/AttendanceManager";

const Attendance = () => {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [date, setDate] = useState(today);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white">Attendance</h1>
          <p className="text-construction-concrete">Daily workforce attendance</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-construction-concrete text-sm">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-construction-slate border border-construction-steel/30 rounded-md px-3 py-2 text-white"
          />
        </div>
      </div>

      <AttendanceManager date={date} />
    </div>
  );
};

export default Attendance;
