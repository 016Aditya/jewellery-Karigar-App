import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  rates: {},
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    // payload is the array returned by GET /api/metal-rate/current:
    // [{ metalType, currentRate, percentageChange }, ...]
    setMetalRates: (state, action) => {
      const rates = {};
      for (const entry of action.payload) {
        rates[entry.metalType] = {
          rate: entry.currentRate,
          change: entry.percentageChange,
        };
      }
      state.rates = rates;
    },

    // Merges a single metal's { metalType, currentRate, percentageChange } into state,
    // so one metal's rate can be refreshed without reloading the whole app.
    updateMetalRate: (state, action) => {
      const { metalType, currentRate, percentageChange } = action.payload;
      state.rates[metalType] = {
        rate: currentRate,
        change: percentageChange,
      };
    },
  },
});

export const { setMetalRates, updateMetalRate } = uiSlice.actions;
export default uiSlice.reducer;
