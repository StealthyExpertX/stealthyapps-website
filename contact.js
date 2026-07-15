const CONTACT_MAILBOXES = {
  support: {
    local: [115, 117, 112, 112, 111, 114, 116],
    domain: [115, 116, 101, 97, 108, 116, 104, 121, 97, 112, 112, 115],
    tld: [99, 111, 109],
  },
  privacy: {
    local: [112, 114, 105, 118, 97, 99, 121],
    domain: [115, 116, 101, 97, 108, 116, 104, 121, 97, 112, 112, 115],
    tld: [99, 111, 109],
  },
};

const WEBMAIL_PROVIDERS = {
  gmail: {
    label: 'Gmail',
    buildUrl: (compose) =>
      `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(compose.to)}` +
      `&su=${encodeURIComponent(compose.subject)}` +
      `&body=${encodeURIComponent(compose.body)}`,
  },
  outlook: {
    label: 'Outlook',
    buildUrl: (compose) =>
      `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(compose.to)}` +
      `&subject=${encodeURIComponent(compose.subject)}` +
      `&body=${encodeURIComponent(compose.body)}`,
  },
  yahoo: {
    label: 'Yahoo Mail',
    buildUrl: (compose) =>
      `https://compose.mail.yahoo.com/?to=${encodeURIComponent(compose.to)}` +
      `&subject=${encodeURIComponent(compose.subject)}` +
      `&body=${encodeURIComponent(compose.body)}`,
  },
};

const DIRECT_SEND_URL_BASE = 'https://formsubmit.co/ajax/';
const DIRECT_SEND_AUTORESPONSE =
  'Thanks for writing in about FillPro. Stealthy Apps received your message and will reply by email. Please keep passwords, payment details, IDs, one-time codes, and saved profile values out of support email.';
const MIN_NAME_LENGTH = 2;
const MIN_MESSAGE_LENGTH = 12;
const KNOWN_PRODUCTS = {
  fillpro: 'FillPro',
};

const CONTACT_CONTEXTS = {
  general: {
    subjectPrefix: 'FillPro',
    requireName: true,
    requireReplyEmail: true,
    idleMessage: 'Add a name, email, and message to send.',
    topics: {
      general: {
        label: 'General',
        recipient: 'support',
        inboxLabel: 'FillPro inbox',
        reasons: [
          ['question', 'General question'],
          ['feedback', 'Feedback'],
          ['other', 'Something else'],
        ],
      },
      product: {
        label: 'FillPro',
        recipient: 'support',
        inboxLabel: 'FillPro product inbox',
        reasons: [
          ['product_help', 'Question about FillPro'],
          ['site_report', 'A page did not fill correctly'],
          ['feature', 'Feature request'],
          ['bug', 'Something is not working'],
          ['uninstall', 'I removed FillPro'],
          ['idea', 'Future tool idea'],
        ],
      },
      business: {
        label: 'Business',
        recipient: 'support',
        inboxLabel: 'FillPro business inbox',
        reasons: [
          ['business', 'Business or partnership'],
          ['press', 'Press or media'],
          ['licensing', 'Licensing or commercial question'],
          ['other', 'Something else'],
        ],
      },
      billing: {
        label: 'Billing',
        recipient: 'support',
        inboxLabel: 'FillPro billing inbox',
        reasons: [
          ['pro_access', 'Upgrade, access, or purchase issue'],
          ['restore', 'Restore purchase or subscription'],
          ['refund', 'Refund or cancellation question'],
          ['pricing', 'Pricing question'],
        ],
      },
      privacy: {
        label: 'Privacy',
        recipient: 'privacy',
        inboxLabel: 'FillPro privacy inbox',
        reasons: [
          ['privacy_question', 'Privacy or policy question'],
          ['saved_profiles', 'Saved profiles or deletion question'],
          ['compliance', 'Compliance or legal request'],
          ['other_privacy', 'Other privacy matter'],
        ],
      },
    },
  },
  product: {
    subjectPrefix: 'Product',
    requireName: false,
    requireReplyEmail: false,
    idleMessage: 'Add the requested details to send your message.',
    topics: {},
  },
};

function buildProductContext(form) {
  const productName = (form.dataset.contactProduct || 'Product').trim();

  return {
    subjectPrefix: productName,
    requireName: false,
    requireReplyEmail: false,
    idleMessage: 'Add the requested details to send your message.',
    topics: {
      support: {
        label: 'Support',
        recipient: 'support',
        inboxLabel: `${productName} inbox`,
        reasons: [
          ['site_issue', 'A site or workflow did not fill correctly'],
          ['wrong_fill', 'The wrong field was matched'],
          ['setup', 'Setup or usage question'],
          ['feature', 'Feature request'],
          ['other', 'Something else'],
        ],
      },
      billing: {
        label: 'Billing',
        recipient: 'support',
        inboxLabel: `${productName} billing inbox`,
        reasons: [
          ['pro_access', 'Upgrade, access, or purchase issue'],
          ['restore', 'Restore purchase or subscription'],
          ['refund', 'Refund or cancellation question'],
          ['pricing', 'Pricing question'],
        ],
      },
      privacy: {
        label: 'Privacy',
        recipient: 'privacy',
        inboxLabel: `${productName} privacy inbox`,
        reasons: [
          ['data_question', 'Saved profiles question'],
          ['delete_saved_profiles', 'How do I remove saved profiles?'],
          ['policy', 'Privacy policy question'],
          ['compliance', 'Compliance or legal request'],
        ],
      },
    },
  };
}

function resolveContactContext(form) {
  const contextKey = form.dataset.contactContext;

  if (contextKey === 'product') {
    return buildProductContext(form);
  }

  return CONTACT_CONTEXTS[contextKey] || CONTACT_CONTEXTS.general;
}

function normalizeProductLabel(rawValue) {
  const value = `${rawValue || ''}`.trim();
  if (!value) return '';

  const mapped = KNOWN_PRODUCTS[value.toLowerCase()];
  if (mapped) return mapped;

  return value.replace(/\s+/g, ' ').slice(0, 48);
}

function getContactPrefill() {
  const params = new URLSearchParams(window.location.search);
  return {
    topic: `${params.get('topic') || ''}`.trim(),
    reason: `${params.get('reason') || ''}`.trim(),
    productLabel: normalizeProductLabel(params.get('product')),
  };
}

function decodeChars(values = []) {
  return String.fromCharCode(...values);
}

function decodeMailbox(mailbox) {
  return `${decodeChars(mailbox.local)}@${decodeChars(mailbox.domain)}.${decodeChars(mailbox.tld)}`;
}

function getDefaultTopicKey(topics) {
  return Object.keys(topics)[0] || '';
}

function getTopicConfig(topics, topic) {
  return topics[topic] || topics[getDefaultTopicKey(topics)];
}

function buildReasonOptions(config) {
  return config.reasons
    .map(([value, label]) => `<option value="${value}">${label}</option>`)
    .join('');
}

function findReasonLabel(config, reasonValue) {
  const match = config.reasons.find(([value]) => value === reasonValue);
  return match ? match[1] : config.reasons[0][1];
}

function joinRequirementList(items) {
  if (items.length <= 1) {
    return items[0] || '';
  }

  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }

  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

function buildComposePayload(
  context,
  config,
  reasonLabel,
  name,
  replyEmail,
  message,
  productLabel,
) {
  const recipient = decodeMailbox(CONTACT_MAILBOXES[config.recipient]);
  const subjectLabel =
    config.label === 'FillPro' ? 'Product' : config.label;
  const subjectPrefix = productLabel || context.subjectPrefix;
  const subject = `${subjectLabel}: ${reasonLabel} | ${subjectPrefix}`;
  const bodyLines = [
    `Topic: ${config.label}`,
    `Reason: ${reasonLabel}`,
    productLabel ? `Product: ${productLabel}` : null,
    `Name: ${name || 'Not provided'}`,
    `Reply email: ${replyEmail || 'Use the sender address from this message'}`,
    `Page: ${window.location.pathname}`,
    '',
    'Message:',
    message,
  ].filter(Boolean);

  const body = bodyLines.join('\n');

  return {
    to: recipient,
    subject,
    body,
    mailto:
      `mailto:${recipient}?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body.slice(0, 3200))}`,
  };
}

function buildDirectSendPayload(
  compose,
  config,
  reasonLabel,
  name,
  replyEmail,
  message,
  honeypotValue,
) {
  const replyFields = replyEmail
    ? {
        email: replyEmail,
        _replyto: replyEmail,
      }
    : {};
  return {
    endpoint: `${DIRECT_SEND_URL_BASE}${encodeURIComponent(compose.to)}`,
    body: {
      name: name || 'Not provided',
      ...replyFields,
      topic: config.label,
      reason: reasonLabel,
      page: window.location.href,
      message,
      details: compose.body,
      'Submission method': 'Direct send from site form',
      _subject: compose.subject,
      _template: 'table',
      _captcha: 'false',
      _autoresponse: DIRECT_SEND_AUTORESPONSE,
      _honey: honeypotValue || '',
    },
  };
}

function copyTextFallback(text) {
  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  field.style.position = 'absolute';
  field.style.left = '-9999px';
  document.body.appendChild(field);
  field.select();
  const copied = document.execCommand('copy');
  document.body.removeChild(field);
  return copied;
}

async function copyComposeText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  return copyTextFallback(text);
}

function setStatus(statusNode, state, text) {
  statusNode.dataset.state = state;
  statusNode.setAttribute('role', state === 'error' ? 'alert' : 'status');
  statusNode.setAttribute(
    'aria-live',
    state === 'error' ? 'assertive' : 'polite',
  );
  statusNode.setAttribute('aria-atomic', 'true');
  statusNode.textContent = text;
}

async function sendDirectMessage(payload) {
  const response = await fetch(payload.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload.body),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      (data && data.message) || 'Direct send is unavailable right now.',
    );
  }

  if (
    data &&
    Object.prototype.hasOwnProperty.call(data, 'success') &&
    data.success !== true &&
    data.success !== 'true'
  ) {
    throw new Error(data.message || 'Direct send is unavailable right now.');
  }

  return data;
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('[data-contact-form]');
  if (!form) {
    return;
  }

  const contactSection =
    form.closest('.contact-card') || form.parentElement || document;
  const prefill = getContactPrefill();
  const context = { ...resolveContactContext(form) };
  const isUninstallFeedback = prefill.reason === 'uninstall';
  if (isUninstallFeedback) {
    context.requireName = false;
    context.requireReplyEmail = false;
    context.allowAnonymousDirect = true;
  }
  const topics = context.topics;
  const topicField = form.querySelector('#contactTopic');
  const reasonField = form.querySelector('#contactReason');
  const recipientNote = form.querySelector('[data-recipient-note]');
  const contextNote = contactSection.querySelector(
    '[data-contact-context-note]',
  );
  const statusNode = form.querySelector('[data-contact-status]');
  const messageField = form.querySelector('#contactMessage');
  const replyField = form.querySelector('#contactReply');
  const nameField = form.querySelector('#contactName');
  const emailOptions = form.querySelector('[data-email-options]');
  const composeSummary = form.querySelector('[data-compose-summary]');
  const copyButton = form.querySelector('[data-compose-copy]');
  const honeypotField = form.querySelector('[data-contact-honey]');
  const actionButtons = form.querySelectorAll('[data-contact-action]');
  let currentCompose = null;
  let isBusy = false;
  let hasAppliedPrefillReason = false;
  let hasInteracted = false;

  if (
    !topicField ||
    !reasonField ||
    !statusNode ||
    !messageField ||
    !replyField ||
    !nameField
  ) {
    return;
  }

  function hideEmailOptions() {
    currentCompose = null;

    if (emailOptions) {
      emailOptions.hidden = true;
    }

    if (composeSummary) {
      composeSummary.textContent = '';
    }
  }

  function showEmailOptions(compose) {
    if (!emailOptions) {
      return;
    }

    currentCompose = compose;

    emailOptions.querySelectorAll('[data-compose-link]').forEach((link) => {
      const provider = link.dataset.composeLink;

      if (provider === 'default') {
        link.href = compose.mailto;
        return;
      }

      if (WEBMAIL_PROVIDERS[provider]) {
        link.href = WEBMAIL_PROVIDERS[provider].buildUrl(compose);
      }
    });

    if (composeSummary) {
      composeSummary.textContent = `Ready for ${compose.to}. Use any option below if you would rather send it through your own email app.`;
    }

    emailOptions.hidden = false;
  }

  function setActionState(nextBusy) {
    isBusy = Boolean(nextBusy);

    actionButtons.forEach((button) => {
      if (isBusy) {
        button.setAttribute('aria-busy', 'true');
      } else {
        button.removeAttribute('aria-busy');
      }
    });

    refreshFormState({ syncStatus: false });
  }

  function getFormState(requestedAction) {
    const blockers = [];
    const topic = topicField.value;
    const reason = reasonField.value;
    const message = messageField.value.trim();
    const replyEmail = replyField.value.trim();
    const name = nameField.value.trim();
    let focusTarget = null;

    if (context.requireName && name.length < MIN_NAME_LENGTH) {
      blockers.push('your name');
      focusTarget = focusTarget || nameField;
    }

    if (
      (context.requireReplyEmail ||
        (requestedAction === 'direct' && !context.allowAnonymousDirect)) &&
      !replyEmail
    ) {
      blockers.push('a reply email');
      focusTarget = focusTarget || replyField;
    } else if (replyEmail && !replyField.checkValidity()) {
      blockers.push('a valid email address');
      focusTarget = focusTarget || replyField;
    }

    if (!topic) {
      blockers.push('a topic');
      focusTarget = focusTarget || topicField;
    }

    if (!reason) {
      blockers.push('a reason');
      focusTarget = focusTarget || reasonField;
    }

    if (message.length < MIN_MESSAGE_LENGTH) {
      blockers.push(`a message of at least ${MIN_MESSAGE_LENGTH} characters`);
      focusTarget = focusTarget || messageField;
    }

    return {
      valid: blockers.length === 0,
      blockers,
      focusTarget,
      topic,
      reason,
      message,
      replyEmail,
      name,
    };
  }

  function getReadinessMessage() {
    const composeState = getFormState('compose');
    const directState = getFormState('direct');

    if (!composeState.valid) {
      return `Complete ${joinRequirementList(composeState.blockers)} to keep going.`;
    }

    return 'Ready to send.';
  }

  function refreshFormState({ syncStatus = true } = {}) {
    const composeState = getFormState('compose');
    const directState = getFormState('direct');

    actionButtons.forEach((button) => {
      const action =
        button.dataset.contactAction === 'direct' ? 'direct' : 'compose';
      const canUse =
        action === 'direct' ? directState.valid : composeState.valid;

      button.disabled = isBusy || !canUse;
      button.setAttribute('aria-disabled', String(button.disabled));

      if (!isBusy) {
        button.removeAttribute('aria-busy');
      }
    });

    if (syncStatus && !isBusy) {
      setStatus(
        statusNode,
        'idle',
        hasInteracted ? getReadinessMessage() : context.idleMessage,
      );
    }

    return { composeState, directState };
  }

  function updateTopicState() {
    hideEmailOptions();

    if (!topics[topicField.value]) {
      topicField.value = getDefaultTopicKey(topics);
    }

    const config = getTopicConfig(topics, topicField.value);
    reasonField.innerHTML = buildReasonOptions(config);
    reasonField.value = config.reasons[0][0];
    if (
      !hasAppliedPrefillReason &&
      topicField.value === prefill.topic &&
      config.reasons.some(([value]) => value === prefill.reason)
    ) {
      reasonField.value = prefill.reason;
      hasAppliedPrefillReason = true;
    }
    if (recipientNote) {
      recipientNote.textContent = '';
    }
    refreshFormState();
  }

  if (isUninstallFeedback) {
    if (contextNote) {
      contextNote.hidden = false;
      contextNote.textContent =
        'What made you remove FillPro? One sentence is enough. Name and email are optional.';
    }
    messageField.placeholder = 'What got in the way?';
    nameField.required = false;
    replyField.required = false;
    const nameLabel = form.querySelector('[data-contact-name-label]');
    const replyLabel = form.querySelector('[data-contact-reply-label]');
    if (nameLabel) nameLabel.textContent = 'Name (optional)';
    if (replyLabel) replyLabel.textContent = 'Reply email (optional)';
  } else if (prefill.productLabel) {
    if (contextNote) contextNote.hidden = true;
    messageField.placeholder =
      'What happened, what you expected, and what you need next.';
  } else if (contextNote) {
    contextNote.hidden = true;
  }

  if (prefill.topic && topics[prefill.topic]) {
    topicField.value = prefill.topic;
  } else if (prefill.productLabel && topics.product) {
    topicField.value = 'product';
    prefill.topic = 'product';
  } else if (!topicField.value) {
    topicField.value = getDefaultTopicKey(topics);
  }

  topicField.addEventListener('change', () => {
    hasInteracted = true;
    updateTopicState();
  });
  updateTopicState();

  const draftChangeHandlers = [
    [reasonField, 'change'],
    [messageField, 'input'],
    [replyField, 'input'],
    [nameField, 'input'],
  ].filter(([field]) => Boolean(field));

  draftChangeHandlers.forEach(([field, eventName]) => {
    field.addEventListener(eventName, () => {
      hasInteracted = true;
      if (currentCompose) {
        hideEmailOptions();
      }

      refreshFormState();
    });
  });

  if (copyButton) {
    copyButton.addEventListener('click', async () => {
      if (!currentCompose) {
        setStatus(
          statusNode,
          'error',
          'Open an email draft first, then copy the details if you need them.',
        );
        return;
      }

      const textToCopy = [
        `To: ${currentCompose.to}`,
        `Subject: ${currentCompose.subject}`,
        '',
        currentCompose.body,
      ].join('\n');

      try {
        const copied = await copyComposeText(textToCopy);

        if (!copied) {
          throw new Error('Copy failed');
        }

        setStatus(statusNode, 'success', 'Email details copied.');
      } catch (error) {
        setStatus(
          statusNode,
          'error',
          'Copy failed here. Use one of the email buttons instead.',
        );
      }
    });
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const requestedAction =
      event.submitter && event.submitter.dataset.contactAction
        ? event.submitter.dataset.contactAction
        : 'direct';

    const formState = getFormState(requestedAction);
    const topic = formState.topic;
    const reason = formState.reason;
    const config = getTopicConfig(topics, topic);
    const message = formState.message;
    const replyEmail = formState.replyEmail;
    const name = formState.name;
    if (!formState.valid) {
      setStatus(
        statusNode,
        'error',
        requestedAction === 'direct'
          ? `Complete ${joinRequirementList(formState.blockers)} before sending here.`
          : `Complete ${joinRequirementList(formState.blockers)} before opening your email app.`,
      );

      if (formState.focusTarget) {
        formState.focusTarget.focus();
      }

      return;
    }

    const reasonLabel = findReasonLabel(config, reason);
    const compose = buildComposePayload(
      context,
      config,
      reasonLabel,
      name,
      replyEmail,
      message,
      prefill.productLabel,
    );

    if (requestedAction === 'compose') {
      showEmailOptions(compose);

      setStatus(statusNode, 'success', 'Your email draft is ready below.');
      return;
    }

    if (typeof fetch !== 'function') {
      setStatus(
        statusNode,
        'error',
        'This browser needs the Email App option.',
      );
      return;
    }

    const directPayload = buildDirectSendPayload(
      compose,
      config,
      reasonLabel,
      name,
      replyEmail,
      message,
      honeypotField ? honeypotField.value.trim() : '',
    );

    hideEmailOptions();
    setActionState(true);
    setStatus(statusNode, 'idle', 'Sending from this page...');

    try {
      await sendDirectMessage(directPayload);

      form.reset();
      hasInteracted = false;
      updateTopicState();
      hideEmailOptions();
      refreshFormState({ syncStatus: false });
      setStatus(
        statusNode,
        'success',
        `Sent. Watch for a reply at ${replyEmail}.`,
      );
    } catch (error) {
      showEmailOptions(compose);
      setStatus(
        statusNode,
        'error',
        `${error.message} You can use Email App below instead.`,
      );
    } finally {
      setActionState(false);
    }
  });
});
