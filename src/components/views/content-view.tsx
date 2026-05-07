"use client";

import { MaterialListView } from "@/components/material/material-list-view";
import { MaterialDetailView } from "@/components/material/material-detail";

export function ContentView() {
  return (
    <div className="flex h-full view-animate">
      <div className="flex-1 overflow-hidden">
        <MaterialListView />
      </div>
      <MaterialDetailView />
    </div>
  );
}
