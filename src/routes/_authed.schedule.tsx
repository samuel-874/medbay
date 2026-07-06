import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  useSessionUser,
  useStaffList,
  useShifts,
  useCreateShift,
  useDeleteShift,
  type Shift,
} from "@/lib/medbay-store";

export const Route = createFileRoute("/_authed/schedule")({
  component: SchedulePage,
});

const SHIFTS: Shift["shift"][] = ["morning", "afternoon", "night"];

function SchedulePage() {
  const { data: me } = useSessionUser();
  const { data: staffList = [], isLoading: isLoadingStaff } = useStaffList();

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [weekStart],
  );

  const weekStartStr = days[0].toISOString().slice(0, 10);
  const weekEndStr = days[6].toISOString().slice(0, 10);
  const { data: shifts = [], isLoading: isLoadingShifts } = useShifts(weekStartStr, weekEndStr);

  const createShiftMutation = useCreateShift();
  const deleteShiftMutation = useDeleteShift();

  const isLoading = isLoadingStaff || isLoadingShifts;
  const isAdmin = me?.role === "admin";

  const staff = staffList.filter((u) => u.role === "staff");
  const visibleStaff = isAdmin ? staff : staff.filter((s) => s.id === me?.id);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-3 w-16 bg-muted rounded"></div>
            <div className="h-9 w-48 bg-muted rounded"></div>
          </div>
          <div className="h-10 w-40 bg-muted rounded"></div>
        </div>
        <div className="card-soft p-6 h-64 bg-card"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Roster</p>
          <h1 className="font-serif text-4xl text-primary mt-1">Duty schedule</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekStart(shift(weekStart, -7))}
            className="rounded-md border border-border bg-card px-2 py-1 text-sm hover:bg-secondary cursor-pointer"
          >
            ←
          </button>
          <span className="text-sm text-muted-foreground">
            {days[0].toLocaleDateString(undefined, { month: "short", day: "numeric" })} –{" "}
            {days[6].toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </span>
          <button
            onClick={() => setWeekStart(shift(weekStart, 7))}
            className="rounded-md border border-border bg-card px-2 py-1 text-sm hover:bg-secondary cursor-pointer"
          >
            →
          </button>
        </div>
      </div>

      {visibleStaff.length === 0 ? (
        <div className="card-soft p-10 text-center text-sm text-muted-foreground">
          {isAdmin ? "Add staff first to build the roster." : "You have no schedule yet."}
        </div>
      ) : (
        <div className="card-soft overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="sticky left-0 bg-card z-10 border-r border-border text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground min-w-[120px]">
                  Staff
                </th>
                {days.map((d) => (
                  <th
                    key={d.toISOString()}
                    className="px-2 py-3 text-xs font-medium text-muted-foreground text-center"
                  >
                    <div>{d.toLocaleDateString(undefined, { weekday: "short" })}</div>
                    <div className="text-foreground font-normal">{d.getDate()}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleStaff.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0">
                  <td className="sticky left-0 bg-card z-10 border-r border-border px-4 py-3 font-medium whitespace-nowrap">{u.username}</td>
                  {days.map((d) => {
                    const iso = d.toISOString().slice(0, 10);
                    const cell = shifts.find((s) => s.staffId === u.id && s.date === iso);
                    return (
                      <td key={iso} className="px-2 py-2 text-center align-middle">
                        {isAdmin ? (
                          <select
                            value={cell?.shift ?? ""}
                            disabled={
                              createShiftMutation.isPending || deleteShiftMutation.isPending
                            }
                            onChange={async (e) => {
                              try {
                                if (cell) {
                                  await deleteShiftMutation.mutateAsync(cell.id);
                                }
                                if (e.target.value) {
                                  await createShiftMutation.mutateAsync({
                                    staffId: u.id,
                                    date: iso,
                                    shift: e.target.value as Shift["shift"],
                                  });
                                }
                              } catch (err) {
                                console.error(err);
                              }
                            }}
                            className={
                              "w-full rounded-md border px-1.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer disabled:opacity-50 " +
                              (cell
                                ? "bg-accent/10 text-accent border-accent/20"
                                : "bg-card border-input text-muted-foreground")
                            }
                          >
                            <option value="">—</option>
                            {SHIFTS.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        ) : cell ? (
                          <span className="inline-block rounded-md bg-accent/10 text-accent px-2 py-1 text-xs">
                            {cell.shift}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay(); // 0=Sun
  const diff = (day + 6) % 7; // week starts Monday
  x.setDate(x.getDate() - diff);
  return x;
}
function shift(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}
