import { useCurrentFarm } from "../context/CurrentFarmContext";

export default function FarmSwitcher() {
  const { farms, currentFarmId, setCurrentFarmId } = useCurrentFarm();

  if (farms.length <= 1) {
    return null;
  }

  return (
    <label className="farm-switcher">
      <span className="farm-switcher-label">Farm</span>
      <select
        className="farm-switcher-select"
        value={currentFarmId}
        onChange={(event) => setCurrentFarmId(event.target.value)}
      >
        {farms.map((farm) => (
          <option key={farm.id} value={farm.id}>
            {farm.name}
          </option>
        ))}
      </select>
    </label>
  );
}
