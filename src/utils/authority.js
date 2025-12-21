import AppError from "./AppError.js";

/**
 * Tiers of Authority
 * 1 (Highest) -> 6 (Lowest)
 * A user can only manage/create things AT A LOWER TIER.
 */
export const AUTHORITY_TIERS = {
  superAdmin: 1,
  sysadmin: 1,
  admin: 1,
  groupAdmin: 2,
  companyAdmin: 3,
  manager: 3,
  complianceOfficer: 4,
  siteManager: 5,
  auditor: 5,
  problemOwner: 6,
  approver: 6,
};

/**
 * Scope Weights for Comparison
 * system (100) > group (75) > company (50) > site (25)
 */
export const SCOPE_WEIGHTS = {
  system: 100,
  group: 75,
  company: 50,
  site: 25,
};

/**
 * Validates if the requester has authority to create a target with specific role/scope/anchor.
 *
 * @param {Object} requester - The user making the request (req.user)
 * @param {Object} target - Details of what's being created
 * @param {string} target.role - Role of the new user/entity
 * @param {string} target.scopeLevel - system, group, company, or site
 * @param {string} target.assignedGroup - ID of assigned group
 * @param {string} target.assignedCompany - ID of assigned company
 * @param {string} target.assignedSite - ID of assigned site
 */
export const validateAuthority = (requester, target) => {
  const requesterTier = AUTHORITY_TIERS[requester.role] || 5;
  const targetTier = AUTHORITY_TIERS[target.role] || 5;
  const requesterScopeWeight = SCOPE_WEIGHTS[requester.scopeLevel] || 0;
  const targetScopeWeight = SCOPE_WEIGHTS[target.scopeLevel] || 0;

  // 1. SysAdmin/SuperAdmin Override (Tier 1)
  if (requesterTier === 1) return true;

  // 2. Vertical Validation: No Peer/Upward Creation
  // Creator tier must be strictly LESS (physically lower number = higher authority)
  if (targetTier <= requesterTier) {
    throw new AppError(
      `A ${requester.role} cannot create a user with the role ${target.role} (Peer or Higher).`,
      403
    );
  }

  // 3. Scope Gate: Cannot create a scope higher than your own
  if (targetScopeWeight > requesterScopeWeight) {
    throw new AppError(
      `A ${requester.scopeLevel}-level user cannot create a ${target.scopeLevel}-level user.`,
      403
    );
  }

  // 4. Anchor Gate (Horizontal Validation)
  // Group Admin validation
  if (requester.role === "groupAdmin") {
    if (
      target.assignedGroup &&
      target.assignedGroup.toString() !== requester.assignedGroup?.toString()
    ) {
      throw new AppError(
        "You can only manage resources within your own group.",
        403
      );
    }
  }

  // Company Admin validation
  if (requester.role === "companyAdmin") {
    if (
      target.assignedCompany &&
      target.assignedCompany.toString() !==
        requester.assignedCompany?.toString()
    ) {
      throw new AppError(
        "You can only manage resources within your own company.",
        403
      );
    }
    // Also ensure they don't try to assign to a different group (even if they don't provide it)
    if (
      target.assignedGroup &&
      target.assignedGroup.toString() !== requester.assignedGroup?.toString()
    ) {
      throw new AppError("Cross-group management is strictly prohibited.", 403);
    }
  }

  return true;
};

/**
 * Validates if the requester has authority to create an entity (Company or Site).
 *
 * @param {Object} requester - The user making the request (req.user)
 * @param {string} entityType - 'company' or 'site'
 * @param {Object} targetData - Data of the entity being created
 */
export const validateEntityCreation = (requester, entityType, targetData) => {
  const requesterTier = AUTHORITY_TIERS[requester.role] || 5;

  // 1. SysAdmin/SuperAdmin Override
  if (requesterTier === 1) return true;

  // 2. Company Creation Logic
  if (entityType === "company") {
    // Only GroupAdmins can create companies
    if (requester.role !== "groupAdmin") {
      throw new AppError("Only Group Admins can create companies.", 403);
    }
    // Anchor check
    if (
      targetData.group &&
      targetData.group.toString() !== requester.assignedGroup?.toString()
    ) {
      throw new AppError(
        "You can only create companies within your own group.",
        403
      );
    }
  }

  // 3. Site Creation Logic
  if (entityType === "site") {
    // Only GroupAdmins or CompanyAdmins can create sites
    if (!["groupAdmin", "companyAdmin"].includes(requester.role)) {
      throw new AppError("Only Group or Company Admins can create sites.", 403);
    }
    // Anchor check (Company Admin)
    if (requester.role === "companyAdmin") {
      if (
        targetData.company &&
        targetData.company.toString() !== requester.assignedCompany?.toString()
      ) {
        throw new AppError(
          "You can only create sites within your own company.",
          403
        );
      }
    }
    // Anchor check (Group Admin)
    if (requester.role === "groupAdmin") {
      if (
        targetData.group &&
        targetData.group.toString() !== requester.assignedGroup?.toString()
      ) {
        throw new AppError(
          "You can only create sites for companies within your own group.",
          403
        );
      }
    }
  }

  return true;
};
