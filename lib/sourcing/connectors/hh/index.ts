/**
 * Env/DB wiring for the hh.uz connector. Pure connector pieces stay testable;
 * this file exports the live company-aware binding used by the sourcing worker.
 */
export {
  checkHhHealth,
  createHhConnectorForCompany,
  disconnectCompanyHh,
  hhAvailableForCompany,
  saveCompanyHhConnection,
} from "./connection";
