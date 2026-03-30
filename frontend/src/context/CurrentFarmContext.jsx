import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { queryKeys } from "../api/queryKeys";
import { useAuth } from "./AuthContext";

const STORAGE_KEY = "farmstock_current_farm_id";
const CurrentFarmContext = createContext(null);

export function CurrentFarmProvider({ children }) {
  const { token } = useAuth();
  const [currentFarmId, setCurrentFarmId] = useState(
    () => localStorage.getItem(STORAGE_KEY) || ""
  );

  const farmsQuery = useQuery({
    queryKey: queryKeys.farms.all(),
    queryFn: api.getFarms,
    enabled: Boolean(token),
  });

  const farms = farmsQuery.data || [];

  useEffect(() => {
    if (!farms.length) {
      if (currentFarmId) {
        setCurrentFarmId("");
      }
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    const hasSelectedFarm = farms.some((farm) => String(farm.id) === String(currentFarmId));
    if (hasSelectedFarm) {
      return;
    }

    const nextFarmId = String(farms[0].id);
    setCurrentFarmId(nextFarmId);
    localStorage.setItem(STORAGE_KEY, nextFarmId);
  }, [currentFarmId, farms]);

  function selectFarm(nextFarmId) {
    const value = String(nextFarmId);
    setCurrentFarmId(value);
    localStorage.setItem(STORAGE_KEY, value);
  }

  const currentFarm = farms.find((farm) => String(farm.id) === String(currentFarmId)) || null;

  const value = useMemo(
    () => ({
      farms,
      farmsQuery,
      currentFarm,
      currentFarmId: currentFarm ? String(currentFarm.id) : "",
      setCurrentFarmId: selectFarm,
    }),
    [currentFarm, farms, farmsQuery]
  );

  return <CurrentFarmContext.Provider value={value}>{children}</CurrentFarmContext.Provider>;
}

export function useCurrentFarm() {
  const context = useContext(CurrentFarmContext);
  if (!context) {
    throw new Error("useCurrentFarm must be used within CurrentFarmProvider");
  }
  return context;
}
