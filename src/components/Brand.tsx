import { LineChart as LineChartIcon } from "lucide-react";

const Brand = () => {
  return (
    <div className="flex items-center gap-2 select-none">
      <div className="p-2 rounded-xl bg-gradient-primary shadow-elev-1">
        <LineChartIcon className="h-5 w-5 text-primary-foreground" />
      </div>
      <span className="font-heading text-xl">FinTrack</span>
    </div>
  );
};

export default Brand;
