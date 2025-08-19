import { Search } from "lucide-react";

export function SearchBar(props: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative w-full">
      <input
        className="input pl-11 h-11"
        placeholder={props.placeholder || "Search stadiums, city, country"}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
      />
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60" size={18} />
    </div>
  );
}
