import Company from "../models/Company.js";
import Site from "../models/Site.js";

/**
 * Middleware to apply scope-based filtering to database queries
 * Filters data based on user's organizational hierarchy level
 */
export const applyScopeFilter = async (req, res, next) => {
  try {
    const { scopeLevel, assignedGroup, assignedCompany, assignedSite } =
      req.user;

    // System level - Super Admin sees everything
    if (scopeLevel === "system") {
      req.scopeFilter = {};
      return next();
    }

    // Group level - see all companies and sites under group
    if (scopeLevel === "group" && assignedGroup) {
      const companies = await Company.find({ group: assignedGroup });
      const sites = await Site.find({
        company: { $in: companies.map((c) => c._id) },
      });

      req.scopeFilter = {
        $or: [
          { group: assignedGroup },
          { company: { $in: companies.map((c) => c._id) } },
          { site: { $in: sites.map((s) => s._id) } },
        ],
      };
      return next();
    }

    // Company level - see all sites under company
    if (scopeLevel === "company" && assignedCompany) {
      const sites = await Site.find({ company: assignedCompany });

      req.scopeFilter = {
        $or: [
          { company: assignedCompany },
          { site: { $in: sites.map((s) => s._id) } },
        ],
      };
      return next();
    }

    // Site level - only see own site
    if (scopeLevel === "site" && assignedSite) {
      req.scopeFilter = { site: assignedSite };
      return next();
    }

    // Default: no access if scope is misconfigured
    req.scopeFilter = { _id: null };
    next();
  } catch (error) {
    next(error);
  }
};
