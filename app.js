(() => {
  const STORAGE_KEY = "alias-studio-history-v1";
  const MAX_BATCH = 5000;
  const DEFAULT_COUNT = 24;
  const DEFAULT_TAGS = [
    "shopping",
    "banking",
    "socials",
    "travel",
    "streaming",
    "gaming",
    "newsletter",
    "orders",
    "billing",
    "security",
    "support",
    "cloud",
    "career",
    "learning",
    "market",
    "deals",
    "events",
    "health",
    "finance",
    "photos",
    "music",
    "trial",
    "apps",
    "alerts",
    "forums",
    "storage",
    "family",
    "work",
    "school",
    "vault",
  ];

  const PROVIDERS = {
    gmail: {
      name: "Gmail",
      domains: ["gmail.com", "googlemail.com"],
      methods: ["gmailPlus", "gmailDots", "gmailDotsPlus"],
      defaults: ["gmailPlus", "gmailDots"],
      note:
        "Gmail aliases here are ready-to-receive for personal Gmail addresses. Dots are not treated as aliases for Google Workspace custom domains.",
    },
    outlook: {
      name: "Outlook.com / Hotmail",
      domains: ["outlook.com", "hotmail.com", "live.com", "msn.com"],
      methods: ["plus"],
      defaults: ["plus"],
      note:
        "Outlook.com supports +site receive-only addresses. Microsoft account aliases are separate addresses that must be created in account settings.",
    },
    proton: {
      name: "Proton Mail",
      domains: ["proton.me", "protonmail.com", "protonmail.ch", "pm.me"],
      methods: ["plus"],
      defaults: ["plus"],
      note:
        "Proton +aliases are ready-to-receive and do not need to be created before use. They are receive-only for composing new messages.",
    },
    exchange: {
      name: "Microsoft 365 / Exchange Online",
      domains: [],
      methods: ["plus"],
      defaults: ["plus"],
      note:
        "Use this for custom domains hosted on Exchange Online. Plus addressing is usually enabled by default, but an organization admin can turn it off.",
    },
    yahoo: {
      name: "Yahoo Mail",
      domains: ["yahoo.com", "ymail.com", "rocketmail.com"],
      methods: ["yahooDisposable"],
      defaults: ["yahooDisposable"],
      note:
        "Yahoo disposable addresses use nickname-keyword format and require disposable address setup in Yahoo Mail. The generated addresses are planning candidates until enabled there.",
    },
    icloud: {
      name: "iCloud Mail",
      domains: ["icloud.com", "me.com", "mac.com"],
      methods: ["icloudAlias"],
      defaults: ["icloudAlias"],
      note:
        "iCloud Mail aliases and Hide My Email addresses must be created inside iCloud. The generated addresses are setup candidates for tracking.",
    },
    unknown: {
      name: "Unknown / unsupported",
      domains: [],
      methods: [],
      defaults: [],
      note:
        "No supported dynamic alias rule is known for this domain. If the mailbox is hosted by Exchange Online, choose Microsoft 365 / Exchange Online manually.",
    },
  };

  const METHOD_DEFS = {
    gmailPlus: {
      name: "Plus tags",
      short: "Plus",
      mode: "ready",
      help: "username+tag@gmail.com",
      unlimited: true,
      createGenerator: makePlusGenerator,
    },
    gmailDots: {
      name: "Dot aliases",
      short: "Dots",
      mode: "ready",
      help: "every dotted version of a personal Gmail username",
      getCapacity: (ctx) => getGmailDotCapacity(ctx),
      createGenerator: makeGmailDotGenerator,
    },
    gmailDotsPlus: {
      name: "Dot plus tags",
      short: "Dots + plus",
      mode: "ready",
      help: "dotted username with +tag on Gmail",
      unlimited: true,
      getCapacity: (ctx) => (getGmailDotCapacity(ctx) > 0n ? Infinity : 0n),
      createGenerator: makeGmailDotPlusGenerator,
    },
    plus: {
      name: "Plus tags",
      short: "Plus",
      mode: "ready",
      help: "username+tag@domain",
      unlimited: true,
      createGenerator: makePlusGenerator,
    },
    yahooDisposable: {
      name: "Disposable keyword",
      short: "Yahoo disposable",
      mode: "setup",
      help: "nickname-keyword@yahoo.com",
      getCapacity: () => 500n,
      createGenerator: makeYahooDisposableGenerator,
    },
    icloudAlias: {
      name: "iCloud alias candidates",
      short: "iCloud alias",
      mode: "setup",
      help: "up to three @icloud.com aliases",
      getCapacity: () => 3n,
      createGenerator: makeIcloudAliasGenerator,
    },
  };

  const els = {};
  const state = {
    activeKey: null,
    providerId: "unknown",
    providerLocked: false,
    selectedMethods: new Set(),
    filter: "all",
    search: "",
    currentCtx: null,
  };

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    cacheElements();
    populateProviders();
    bindEvents();
    renderHistory();
    chooseProvider("unknown", true);
    syncFromEmail();
  }

  function cacheElements() {
    els.form = document.querySelector("#aliasForm");
    els.emailInput = document.querySelector("#emailInput");
    els.providerSelect = document.querySelector("#providerSelect");
    els.countInput = document.querySelector("#countInput");
    els.capacityLine = document.querySelector("#capacityLine");
    els.methodList = document.querySelector("#methodList");
    els.tagInput = document.querySelector("#tagInput");
    els.tagField = document.querySelector("#tagField");
    els.providerNote = document.querySelector("#providerNote");
    els.maxButton = document.querySelector("#maxButton");
    els.aliasList = document.querySelector("#aliasList");
    els.aliasTemplate = document.querySelector("#aliasTemplate");
    els.methodTemplate = document.querySelector("#methodTemplate");
    els.emptyState = document.querySelector("#emptyState");
    els.resultTitle = document.querySelector("#resultTitle");
    els.resultCounts = document.querySelector("#resultCounts");
    els.historyList = document.querySelector("#historyList");
    els.clearCurrent = document.querySelector("#clearCurrent");
    els.aliasSearch = document.querySelector("#aliasSearch");
    els.copyAvailable = document.querySelector("#copyAvailable");
    els.storageStatus = document.querySelector("#storageStatus");
  }

  function populateProviders() {
    Object.entries(PROVIDERS).forEach(([id, provider]) => {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = provider.name;
      els.providerSelect.append(option);
    });
  }

  function bindEvents() {
    els.emailInput.addEventListener("input", () => {
      syncFromEmail();
    });

    els.providerSelect.addEventListener("change", () => {
      state.providerLocked = true;
      chooseProvider(els.providerSelect.value, false);
      updateCapacity();
    });

    els.methodList.addEventListener("change", (event) => {
      const input = event.target.closest("input[type='checkbox']");
      if (!input) {
        return;
      }

      if (input.checked) {
        state.selectedMethods.add(input.value);
      } else {
        state.selectedMethods.delete(input.value);
      }

      updateCapacity();
    });

    els.form.addEventListener("submit", (event) => {
      event.preventDefault();
      handleGenerate();
    });

    els.maxButton.addEventListener("click", () => {
      const capacity = getSelectedCapacity();
      if (capacity === Infinity) {
        els.countInput.value = MAX_BATCH;
        showToast(`Unlimited aliases are generated in batches of ${MAX_BATCH}.`);
        return;
      }

      const finite = Number(capacity);
      if (!Number.isFinite(finite) || finite < 1) {
        els.countInput.value = 1;
        return;
      }

      els.countInput.value = Math.min(finite, MAX_BATCH);
      if (finite > MAX_BATCH) {
        showToast(`This browser batch is capped at ${MAX_BATCH}.`);
      }
    });

    document.querySelectorAll("[data-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        state.filter = button.dataset.filter;
        document.querySelectorAll("[data-filter]").forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        renderResults();
      });
    });

    els.aliasSearch.addEventListener("input", () => {
      state.search = els.aliasSearch.value.trim().toLowerCase();
      renderResults();
    });

    els.copyAvailable.addEventListener("click", () => {
      const record = getActiveRecord();
      if (!record) {
        showToast("Generate or open a saved email first.", true);
        return;
      }

      const available = record.aliases.filter((alias) => !alias.used).map((alias) => alias.address);
      copyLines(available);
    });

    els.aliasList.addEventListener("click", (event) => {
      const toggle = event.target.closest(".used-toggle");
      const addressButton = event.target.closest(".alias-address");

      if (toggle) {
        toggleAliasUsed(toggle.dataset.address);
      } else if (addressButton) {
        copyLines([addressButton.textContent]);
      }
    });

    els.historyList.addEventListener("click", (event) => {
      const item = event.target.closest(".history-item");
      if (item) {
        openRecord(item.dataset.key);
      }
    });

    els.clearCurrent.addEventListener("click", () => {
      if (!state.activeKey) {
        showToast("No saved email is open.", true);
        return;
      }

      const record = getActiveRecord();
      const label = record ? record.displayEmail : "this email";
      if (!window.confirm(`Clear saved aliases for ${label}?`)) {
        return;
      }

      const store = loadStore();
      delete store.records[state.activeKey];
      store.order = store.order.filter((key) => key !== state.activeKey);
      saveStore(store);
      state.activeKey = null;
      renderHistory();
      renderResults();
      showToast("Saved aliases cleared.");
    });
  }

  function syncFromEmail() {
    const parsed = safeParseEmail(els.emailInput.value);
    const detected = parsed ? detectProvider(parsed.domain) : "unknown";
    if (!state.providerLocked && detected !== state.providerId) {
      chooseProvider(detected, true);
    }

    updateCapacity();
  }

  function chooseProvider(providerId, useDefaults) {
    state.providerId = providerId;
    els.providerSelect.value = providerId;

    if (useDefaults) {
      state.selectedMethods = new Set(PROVIDERS[providerId].defaults);
    } else {
      state.selectedMethods = new Set(PROVIDERS[providerId].defaults);
    }

    renderMethods();
    els.providerNote.textContent = PROVIDERS[providerId].note;
  }

  function renderMethods() {
    const provider = PROVIDERS[state.providerId];
    els.methodList.innerHTML = "";

    if (!provider.methods.length) {
      const message = document.createElement("div");
      message.className = "cap-line";
      message.textContent = "No supported alias type is available for this provider.";
      els.methodList.append(message);
      els.tagField.hidden = true;
      return;
    }

    provider.methods.forEach((methodId) => {
      const def = METHOD_DEFS[methodId];
      const node = els.methodTemplate.content.firstElementChild.cloneNode(true);
      const input = node.querySelector("input");
      input.value = methodId;
      input.checked = state.selectedMethods.has(methodId);
      node.querySelector("strong").textContent = def.name;
      node.querySelector("small").textContent = def.help;
      els.methodList.append(node);
    });

    els.tagField.hidden = !provider.methods.some((methodId) => needsTags(methodId));
  }

  function updateCapacity() {
    const parsed = safeParseEmail(els.emailInput.value);
    state.currentCtx = parsed ? makeContext(parsed, state.providerId) : null;
    const capacity = getSelectedCapacity();
    const methods = [...state.selectedMethods];

    if (!parsed) {
      els.capacityLine.textContent = "Enter an email to see supported alias types.";
      els.countInput.max = MAX_BATCH;
      return;
    }

    if (!methods.length || capacity === 0n) {
      els.capacityLine.textContent = "Choose at least one supported alias type.";
      els.countInput.max = 1;
      return;
    }

    if (capacity === Infinity) {
      els.countInput.max = MAX_BATCH;
      els.capacityLine.textContent = `Selected types can create unlimited aliases. This app generates up to ${MAX_BATCH} per batch.`;
    } else {
      const finite = Number(capacity);
      els.countInput.max = Math.max(1, Math.min(finite, MAX_BATCH));
      const batchNote = finite > MAX_BATCH ? ` This app generates up to ${MAX_BATCH} per batch.` : "";
      els.capacityLine.textContent = `Selected types can create ${formatBigInt(capacity)} possible alias${capacity === 1n ? "" : "es"} for this email.${batchNote}`;
    }

    clampCount();
  }

  function handleGenerate() {
    const parsed = safeParseEmail(els.emailInput.value);
    if (!parsed) {
      showToast("Enter a valid email address.", true);
      return;
    }

    const methodIds = [...state.selectedMethods];
    if (!methodIds.length) {
      showToast("Choose at least one alias type.", true);
      return;
    }

    const ctx = makeContext(parsed, state.providerId);
    const capacity = getSelectedCapacity(ctx);
    if (capacity === 0n) {
      showToast("No aliases can be generated for that selection.", true);
      return;
    }

    const desiredCount = clampCount();
    const store = loadStore();
    const existing = store.records[ctx.key];
    const existingAddresses = existing ? existing.aliases.map((alias) => alias.address) : [];
    const aliases = generateAliases(ctx, methodIds, desiredCount, els.tagInput.value, existingAddresses);

    if (!aliases.length) {
      showToast("No unique aliases were generated.", true);
      return;
    }

    const record = mergeRecord(existing, ctx, aliases);
    store.records[ctx.key] = record;
    store.order = [ctx.key, ...store.order.filter((key) => key !== ctx.key)];
    saveStore(store);

    state.activeKey = ctx.key;
    renderHistory();
    renderResults();
    showToast(`${aliases.length} new alias${aliases.length === 1 ? "" : "es"} saved.`);
  }

  function generateAliases(ctx, methodIds, desiredCount, tagText, existingAddresses = []) {
    const tags = buildTags(tagText, Math.max(desiredCount * 3, DEFAULT_TAGS.length));
    const generators = methodIds
      .map((methodId) => {
        const def = METHOD_DEFS[methodId];
        return {
          methodId,
          next: def.createGenerator(ctx, tags, methodId),
        };
      })
      .filter((generator) => typeof generator.next === "function");

    const seen = new Set(existingAddresses.map((address) => address.toLowerCase()));
    const output = [];
    let attempts = 0;
    const attemptsLimit = Math.max(
      desiredCount * 50,
      seen.size + desiredCount + MAX_BATCH * Math.max(generators.length, 1) + 100
    );

    while (output.length < desiredCount && generators.length && attempts < attemptsLimit) {
      let progressed = false;

      for (let index = generators.length - 1; index >= 0; index -= 1) {
        const generator = generators[index];
        const alias = generator.next();
        attempts += 1;

        if (!alias) {
          generators.splice(index, 1);
          continue;
        }

        progressed = true;
        const addressKey = alias.address.toLowerCase();
        if (!seen.has(addressKey)) {
          seen.add(addressKey);
          output.push(alias);
        }

        if (output.length >= desiredCount) {
          break;
        }
      }

      if (!progressed) {
        break;
      }
    }

    return output;
  }

  function makePlusGenerator(ctx, tags, methodId) {
    let index = 0;
    const def = METHOD_DEFS[methodId] || METHOD_DEFS.plus;
    return () => {
      const tag = tags[index] || `alias${String(index + 1).padStart(3, "0")}`;
      index += 1;
      return makeAlias(`${ctx.plusLocal}+${tag}@${ctx.domain}`, methodId, def.short, def.mode);
    };
  }

  function makeGmailDotGenerator(ctx) {
    const def = METHOD_DEFS.gmailDots;
    const stem = ctx.gmailStem;
    if (stem.length < 2) {
      return () => null;
    }

    const maxMask = 1n << BigInt(stem.length - 1);
    let mask = 0n;

    return () => {
      while (mask < maxMask) {
        const dotted = applyDotMask(stem, mask);
        mask += 1n;
        if (dotted.toLowerCase() !== ctx.baseLocal.toLowerCase()) {
          return makeAlias(`${dotted}@${ctx.domain}`, "gmailDots", def.short, def.mode);
        }
      }

      return null;
    };
  }

  function makeGmailDotPlusGenerator(ctx, tags) {
    const def = METHOD_DEFS.gmailDotsPlus;
    const stem = ctx.gmailStem;
    if (stem.length < 2) {
      return () => null;
    }

    const maxMask = 1n << BigInt(stem.length - 1);
    let mask = 0n;
    let tagIndex = 0;

    return () => {
      while (tagIndex < tags.length + MAX_BATCH) {
        if (mask >= maxMask) {
          mask = 0n;
          tagIndex += 1;
        }

        const dotted = applyDotMask(stem, mask);
        mask += 1n;
        if (dotted.toLowerCase() === ctx.baseLocal.toLowerCase()) {
          continue;
        }

        const tag = tags[tagIndex] || `alias${String(tagIndex + 1).padStart(3, "0")}`;
        return makeAlias(`${dotted}+${tag}@${ctx.domain}`, "gmailDotsPlus", def.short, def.mode);
      }

      return null;
    };
  }

  function makeYahooDisposableGenerator(ctx, tags) {
    const def = METHOD_DEFS.yahooDisposable;
    const nickname = sanitizeYahooPart(ctx.baseLocal) || "alias";
    let index = 0;

    return () => {
      if (index >= 500) {
        return null;
      }

      const keyword = sanitizeYahooPart(tags[index] || `tag${index + 1}`) || `tag${index + 1}`;
      index += 1;
      return makeAlias(`${nickname}-${keyword}@${ctx.domain}`, "yahooDisposable", def.short, def.mode);
    };
  }

  function makeIcloudAliasGenerator(ctx, tags) {
    const def = METHOD_DEFS.icloudAlias;
    const root = sanitizeIcloudPart(ctx.baseLocal).slice(0, 12) || "mail";
    let index = 0;

    return () => {
      while (index < 3) {
        const tag = sanitizeIcloudPart(tags[index] || `alias${index + 1}`);
        index += 1;
        const local = fitIcloudAlias(`${root}${tag}`);
        if (local) {
          return makeAlias(`${local}@icloud.com`, "icloudAlias", def.short, def.mode);
        }
      }

      return null;
    };
  }

  function makeAlias(address, methodId, methodName, mode) {
    return {
      address,
      methodId,
      methodName,
      mode,
      used: false,
      createdAt: new Date().toISOString(),
    };
  }

  function getSelectedCapacity(ctx = state.currentCtx) {
    if (!ctx || !state.selectedMethods.size) {
      return 0n;
    }

    let total = 0n;
    for (const methodId of state.selectedMethods) {
      const def = METHOD_DEFS[methodId];
      if (!def) {
        continue;
      }

      const capacity = def.getCapacity ? def.getCapacity(ctx) : def.unlimited ? Infinity : 0n;
      if (capacity === Infinity) {
        return Infinity;
      }
      total += capacity;
    }

    return total;
  }

  function getGmailDotCapacity(ctx) {
    const stem = ctx.gmailStem;
    if (stem.length < 2) {
      return 0n;
    }

    let total = 1n << BigInt(stem.length - 1);
    const exactLocal = ctx.baseLocal.toLowerCase();
    if (exactLocal === applyDotMask(stem, 0n).toLowerCase() || exactLocal.replace(/\./g, "") === stem) {
      total -= 1n;
    }

    return total > 0n ? total : 0n;
  }

  function applyDotMask(stem, mask) {
    let output = "";
    for (let index = 0; index < stem.length; index += 1) {
      output += stem[index];
      if (index < stem.length - 1 && ((mask >> BigInt(index)) & 1n) === 1n) {
        output += ".";
      }
    }
    return output;
  }

  function buildTags(raw, desired) {
    const fromUser = raw
      .split(/[\n,]+/)
      .map((part) => sanitizeTag(part))
      .filter(Boolean);

    const tags = [];
    [...fromUser, ...DEFAULT_TAGS].forEach((tag) => {
      if (!tags.includes(tag)) {
        tags.push(tag);
      }
    });

    let index = 1;
    while (tags.length < desired) {
      tags.push(`alias${String(index).padStart(3, "0")}`);
      index += 1;
    }

    return tags;
  }

  function sanitizeTag(value) {
    return value
      .trim()
      .toLowerCase()
      .replace(/['"]/g, "")
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^[.-]+|[.-]+$/g, "")
      .slice(0, 40);
  }

  function sanitizeYahooPart(value) {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 32);
  }

  function sanitizeIcloudPart(value) {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 20);
  }

  function fitIcloudAlias(value) {
    const clean = sanitizeIcloudPart(value);
    if (clean.length < 3) {
      return `${clean}mail`.slice(0, 20);
    }
    return clean.slice(0, 20);
  }

  function needsTags(methodId) {
    return ["gmailPlus", "gmailDotsPlus", "plus", "yahooDisposable", "icloudAlias"].includes(methodId);
  }

  function makeContext(parsed, providerId) {
    const strippedPlus = parsed.local.split("+")[0];
    const baseLocal = providerId === "gmail" ? strippedPlus : strippedPlus;
    const gmailStem = strippedPlus.replace(/\./g, "").toLowerCase();
    const plusLocal = providerId === "gmail" ? strippedPlus : strippedPlus;
    const keyLocal = providerId === "gmail" ? gmailStem : strippedPlus.toLowerCase();

    return {
      parsed,
      providerId,
      providerName: PROVIDERS[providerId].name,
      key: `${keyLocal}@${parsed.domain}`,
      displayEmail: `${parsed.local}@${parsed.domain}`,
      baseLocal,
      plusLocal,
      gmailStem,
      domain: parsed.domain,
      methodId: null,
    };
  }

  function safeParseEmail(value) {
    const raw = value.trim();
    if (!raw) {
      return null;
    }

    const match = raw.match(/^([^@\s]+)@([^@\s]+\.[^@\s]+)$/);
    if (!match) {
      return null;
    }

    return {
      local: match[1],
      domain: match[2].toLowerCase(),
    };
  }

  function detectProvider(domain) {
    return (
      Object.entries(PROVIDERS).find(([, provider]) => provider.domains.includes(domain))?.[0] || "unknown"
    );
  }

  function clampCount() {
    const max = Number(els.countInput.max || MAX_BATCH);
    const raw = Number.parseInt(els.countInput.value, 10);
    const value = Number.isFinite(raw) ? raw : DEFAULT_COUNT;
    const clamped = Math.max(1, Math.min(value, max || MAX_BATCH));
    els.countInput.value = clamped;
    return clamped;
  }

  function mergeRecord(existing, ctx, generated) {
    const now = new Date().toISOString();
    const record =
      existing ||
      {
        key: ctx.key,
        displayEmail: ctx.displayEmail,
        providerId: ctx.providerId,
        providerName: ctx.providerName,
        createdAt: now,
        updatedAt: now,
        aliases: [],
      };

    record.displayEmail = ctx.displayEmail;
    record.providerId = ctx.providerId;
    record.providerName = ctx.providerName;
    record.updatedAt = now;

    const byAddress = new Map(record.aliases.map((alias) => [alias.address.toLowerCase(), alias]));
    generated.forEach((alias) => {
      const key = alias.address.toLowerCase();
      if (byAddress.has(key)) {
        const current = byAddress.get(key);
        current.methodId = alias.methodId;
        current.methodName = alias.methodName;
        current.mode = alias.mode;
      } else {
        record.aliases.push(alias);
        byAddress.set(key, alias);
      }
    });

    return record;
  }

  function renderResults() {
    const record = getActiveRecord();
    els.aliasList.innerHTML = "";

    if (!record) {
      els.resultTitle.textContent = "No aliases yet";
      els.resultCounts.innerHTML = "<span>0 total</span><span>0 used</span>";
      els.emptyState.hidden = false;
      return;
    }

    const usedCount = record.aliases.filter((alias) => alias.used).length;
    els.resultTitle.textContent = record.displayEmail;
    els.resultCounts.innerHTML = `<span>${record.aliases.length} total</span><span>${usedCount} used</span>`;

    const aliases = record.aliases.filter((alias) => {
      const matchesFilter =
        state.filter === "all" ||
        (state.filter === "used" && alias.used) ||
        (state.filter === "available" && !alias.used);
      const matchesSearch = !state.search || alias.address.toLowerCase().includes(state.search);
      return matchesFilter && matchesSearch;
    });

    els.emptyState.hidden = aliases.length > 0;

    const fragment = document.createDocumentFragment();
    aliases.forEach((alias, index) => {
      const node = els.aliasTemplate.content.firstElementChild.cloneNode(true);
      node.style.animationDelay = `${Math.min(index * 18, 260)}ms`;
      node.classList.toggle("used", alias.used);
      const toggle = node.querySelector(".used-toggle");
      toggle.dataset.address = alias.address;
      toggle.setAttribute("aria-pressed", String(alias.used));
      node.querySelector(".toggle-label").textContent = alias.used ? "Used" : "Unused";
      node.querySelector(".alias-address").textContent = alias.address;
      node.querySelector(".alias-type").textContent = alias.methodName;
      const mode = node.querySelector(".alias-mode");
      mode.textContent = alias.mode === "ready" ? "Ready" : "Setup";
      mode.classList.add(alias.mode);
      fragment.append(node);
    });
    els.aliasList.append(fragment);
  }

  function renderHistory() {
    const store = loadStore();
    els.historyList.innerHTML = "";

    const records = store.order.map((key) => store.records[key]).filter(Boolean);
    els.storageStatus.textContent = records.length
      ? `${records.length} saved email${records.length === 1 ? "" : "s"}`
      : "Local history ready";

    if (!records.length) {
      const empty = document.createElement("div");
      empty.className = "cap-line";
      empty.textContent = "Saved alias sets will appear here.";
      els.historyList.append(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    records.forEach((record) => {
      const used = record.aliases.filter((alias) => alias.used).length;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "history-item";
      button.classList.toggle("active", record.key === state.activeKey);
      button.dataset.key = record.key;
      button.innerHTML = `
        <span class="history-email">${escapeHtml(record.displayEmail)}</span>
        <span class="history-meta">
          <span>${record.aliases.length} aliases</span>
          <span>${used} used</span>
          <span>${escapeHtml(record.providerName)}</span>
        </span>
      `;
      fragment.append(button);
    });
    els.historyList.append(fragment);
  }

  function openRecord(key) {
    const store = loadStore();
    const record = store.records[key];
    if (!record) {
      return;
    }

    state.activeKey = key;
    state.providerLocked = false;
    els.emailInput.value = record.displayEmail;
    chooseProvider(record.providerId, true);
    renderHistory();
    renderResults();
    updateCapacity();
  }

  function getActiveRecord() {
    if (!state.activeKey) {
      return null;
    }

    const store = loadStore();
    return store.records[state.activeKey] || null;
  }

  function toggleAliasUsed(address) {
    if (!state.activeKey || !address) {
      return;
    }

    const store = loadStore();
    const record = store.records[state.activeKey];
    if (!record) {
      return;
    }

    const alias = record.aliases.find((item) => item.address === address);
    if (!alias) {
      return;
    }

    alias.used = !alias.used;
    record.updatedAt = new Date().toISOString();
    saveStore(store);
    renderResults();
    renderHistory();
  }

  function loadStore() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
      if (parsed && parsed.records && Array.isArray(parsed.order)) {
        return parsed;
      }
    } catch {
      return { records: {}, order: [] };
    }

    return { records: {}, order: [] };
  }

  function saveStore(store) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }

  async function copyLines(lines) {
    const text = lines.join("\n");
    if (!text) {
      showToast("No aliases to copy.", true);
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        fallbackCopy(text);
      }
      showToast(lines.length === 1 ? "Alias copied." : `${lines.length} aliases copied.`);
    } catch {
      fallbackCopy(text);
      showToast(lines.length === 1 ? "Alias copied." : `${lines.length} aliases copied.`);
    }
  }

  function fallbackCopy(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }

  function showToast(message, isError = false) {
    document.querySelector(".toast")?.remove();
    const toast = document.createElement("div");
    toast.className = `toast${isError ? " error" : ""}`;
    toast.textContent = message;
    document.body.append(toast);
    window.setTimeout(() => toast.remove(), 2600);
  }

  function formatBigInt(value) {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();
