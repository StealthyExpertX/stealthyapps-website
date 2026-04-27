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

const CONTACT_CONTEXTS = {
  support: {
    subjectPrefix: 'FillPro',
    requireName: false,
    requireReplyEmail: false,
    idleMessage:
      'Choose your email app after the form is ready. You can use your default mail app, Gmail, Outlook, Yahoo, or copy the prepared message.',
    topics: {
      support: {
        label: 'Support',
        recipient: 'support',
        inboxLabel: 'FillPro support inbox',
        reasons: [
          ['site_issue', 'A site did not fill correctly'],
          ['wrong_fill', 'The wrong field was filled'],
          ['upload_help', 'A file upload is not matching'],
          ['feature', 'Feature request'],
          ['general', 'General help'],
        ],
      },
      billing: {
        label: 'Billing / Pro',
        recipient: 'support',
        inboxLabel: 'FillPro billing inbox',
        reasons: [
          ['pro_access', 'Pro access or upgrade problem'],
          ['restore', 'Restore purchase or subscription'],
          ['refund', 'Refund or billing question'],
          ['pricing', 'Pricing question'],
        ],
      },
      privacy: {
        label: 'Privacy',
        recipient: 'privacy',
        inboxLabel: 'FillPro privacy inbox',
        reasons: [
          ['data_question', 'Question about what stays local'],
          ['local_clear', 'How do I clear local data?'],
          ['policy', 'Privacy policy question'],
          ['billing_privacy', 'Purchase or billing privacy question'],
          ['compliance', 'Compliance or legal request'],
        ],
      },
    },
  },
  general: {
    subjectPrefix: 'Stealthy Apps',
    requireName: true,
    requireReplyEmail: true,
    idleMessage:
      'Choose your email app after the form is ready. You can use your default mail app, Gmail, Outlook, Yahoo, or copy the prepared message.',
    topics: {
      general: {
        label: 'General',
        recipient: 'support',
        inboxLabel: 'Stealthy Apps inbox',
        reasons: [
          ['question', 'General question'],
          ['idea', 'Tool or app idea'],
          ['feedback', 'Feedback'],
          ['business', 'Business or partnership'],
          ['other', 'Something else'],
        ],
      },
      privacy: {
        label: 'Privacy',
        recipient: 'privacy',
        inboxLabel: 'Stealthy Apps privacy inbox',
        reasons: [
          ['privacy_question', 'Privacy question'],
          ['data_request', 'Data or deletion request'],
          ['policy', 'Policy question'],
          ['other_privacy', 'Other privacy matter'],
        ],
      },
    },
  },
};

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

function buildComposePayload(context, config, reasonLabel, name, replyEmail, message) {
  const recipient = decodeMailbox(CONTACT_MAILBOXES[config.recipient]);
  const subject = `${context.subjectPrefix} ${config.label}: ${reasonLabel}`;
  const body = [
    `Topic: ${config.label}`,
    `Reason: ${reasonLabel}`,
    `Name: ${name || 'Not provided'}`,
    `Reply email: ${replyEmail || 'Use the sender address from this message'}`,
    `Page: ${window.location.pathname}`,
    '',
    'Message:',
    message,
  ].join('\n');

  return {
    to: recipient,
    subject,
    body,
    mailto:
      `mailto:${recipient}?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body.slice(0, 3200))}`,
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
  statusNode.textContent = text;
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('[data-contact-form]');
  if (!form) {
    return;
  }

  const context =
    CONTACT_CONTEXTS[form.dataset.contactContext] || CONTACT_CONTEXTS.support;
  const topics = context.topics;
  const topicField = form.querySelector('#contactTopic');
  const reasonField = form.querySelector('#contactReason');
  const recipientNote = form.querySelector('[data-recipient-note]');
  const statusNode = form.querySelector('[data-contact-status]');
  const messageField = form.querySelector('#contactMessage');
  const replyField = form.querySelector('#contactReply');
  const nameField = form.querySelector('#contactName');
  const emailOptions = form.querySelector('[data-email-options]');
  const composeSummary = form.querySelector('[data-compose-summary]');
  const copyButton = form.querySelector('[data-compose-copy]');
  let currentCompose = null;

  if (
    !topicField ||
    !reasonField ||
    !recipientNote ||
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
      composeSummary.textContent =
        `Prepared for ${compose.to}. Use the buttons below to open your default mail app, Gmail, Outlook, Yahoo, or copy the message.`;
    }

    emailOptions.hidden = false;
  }

  function updateTopicState() {
    hideEmailOptions();

    if (!topics[topicField.value]) {
      topicField.value = getDefaultTopicKey(topics);
    }

    const config = getTopicConfig(topics, topicField.value);
    reasonField.innerHTML = buildReasonOptions(config);
    reasonField.value = config.reasons[0][0];
    recipientNote.textContent = `${config.inboxLabel} selected.`;
    setStatus(statusNode, 'idle', context.idleMessage);
  }

  if (!topicField.value) {
    topicField.value = getDefaultTopicKey(topics);
  }

  topicField.addEventListener('change', updateTopicState);
  updateTopicState();

  [reasonField, messageField, replyField, nameField].forEach((field) => {
    field.addEventListener('input', () => {
      if (!currentCompose) {
        return;
      }

      hideEmailOptions();
      setStatus(statusNode, 'idle', context.idleMessage);
    });
  });

  if (copyButton) {
    copyButton.addEventListener('click', async () => {
      if (!currentCompose) {
        setStatus(statusNode, 'error', 'Prepare the message first, then use copy if you need it.');
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

        setStatus(statusNode, 'success', 'Email details copied. Paste them into any mail app if you prefer.');
      } catch (error) {
        setStatus(statusNode, 'error', 'Copy failed here. Use the Gmail, Outlook, Yahoo, or default mail app buttons instead.');
      }
    });
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const topic = topicField.value;
    const reason = reasonField.value;
    const config = getTopicConfig(topics, topic);
    const message = messageField.value.trim();
    const replyEmail = replyField.value.trim();
    const name = nameField.value.trim();

    if (context.requireName && !name) {
      setStatus(statusNode, 'error', 'Add your name before choosing an email app.');
      nameField.focus();
      return;
    }

    if (context.requireReplyEmail && !replyEmail) {
      setStatus(
        statusNode,
        'error',
        'Add your email before choosing an email app.',
      );
      replyField.focus();
      return;
    }

    if (replyEmail && !replyField.checkValidity()) {
      setStatus(
        statusNode,
        'error',
        'Use a valid email address before choosing an email app.',
      );
      replyField.focus();
      return;
    }

    if (!topic || !reason || message.length < 10) {
      setStatus(
        statusNode,
        'error',
        'Pick a topic, pick a reason, and write a short message before choosing an email app.',
      );
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
    );

    showEmailOptions(compose);

    setStatus(
      statusNode,
      'success',
      'Choose your email app below. Default mail app, Gmail, Outlook, Yahoo, and copy fallback are ready.',
    );
  });
});
