import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import dayjs from "dayjs";

type OutItem = {
  barcode: string;
  name: string;
  user: string;
  scanned_at: string;
  location: string | null;
};

export default function StillOutTable() {
  const [outItems, setOutItems] = useState<OutItem[]>([]);
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);

  const fetchStillOutItems = async () => {
    const { data, error } = await supabase.rpc("get_still_out_items");
    if (error) {
      console.error("Failed to fetch OUT items:", error);
      return;
    }

    setOutItems(data);
    setLastCheckTime(new Date());
  };

  const isOverdue = (scanned_at: string) => {
    if (!lastCheckTime) return false;
    return new Date(scanned_at) < lastCheckTime;
  };

  useEffect(() => {
    fetchStillOutItems();
  }, []);

  return (
    <div className="p-4 border rounded-xl shadow bg-white">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-semibold">Items Still OUT</h2>
        <button
          onClick={fetchStillOutItems}
          className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
        >
          Refresh / Check Overdue Now
        </button>
      </div>
      <table className="w-full text-sm border">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-2 py-1 text-left">Item</th>
            <th className="px-2 py-1 text-left">Barcode</th>
            <th className="px-2 py-1 text-left">User</th>
            <th className="px-2 py-1 text-left">Time Out</th>
            <th className="px-2 py-1 text-left">Location</th>
            <th className="px-2 py-1 text-left">Overdue</th>
          </tr>
        </thead>
        <tbody>
          {outItems.map((item) => (
            <tr
              key={item.barcode}
              className={isOverdue(item.scanned_at) ? "bg-red-100" : ""}
            >
              <td className="px-2 py-1">{item.name}</td>
              <td className="px-2 py-1">{item.barcode}</td>
              <td className="px-2 py-1">{item.user}</td>
              <td className="px-2 py-1">
                {dayjs(item.scanned_at).format("MMM D, h:mm A")}
              </td>
              <td className="px-2 py-1">{item.location ?? "-"}</td>
              <td className="px-2 py-1">
                {isOverdue(item.scanned_at) ? "Yes" : "No"}
              </td>
            </tr>
          ))}
          {outItems.length === 0 && (
            <tr>
              <td className="px-2 py-2 text-center" colSpan={6}>
                All items are checked in 🎉
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
