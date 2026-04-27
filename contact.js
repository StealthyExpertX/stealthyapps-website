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

const CONTACT_CONTEXTS = {
  support: {
    subjectPrefix: 'FillPro',
    requireName: false,
    requireReplyEmail: false,
    idleMessage:
      'This opens a prefilled draft in your default email app. Nothing gets sent from this site.',
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
      'This opens a prefilled draft in your default email app. Nothing gets sent from this site.',
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

  function updateTopicState() {
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

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const topic = topicField.value;
    const reason = reasonField.value;
    const config = getTopicConfig(topics, topic);
    const message = messageField.value.trim();
    const replyEmail = replyField.value.trim();
    const name = nameField.value.trim();

    if (context.requireName && !name) {
      setStatus(statusNode, 'error', 'Add your name before opening the draft.');
      nameField.focus();
      return;
    }

    if (context.requireReplyEmail && !replyEmail) {
      setStatus(
        statusNode,
        'error',
        'Add your email before opening the draft.',
      );
      replyField.focus();
      return;
    }

    if (replyEmail && !replyField.checkValidity()) {
      setStatus(
        statusNode,
        'error',
        'Use a valid email address before opening the draft.',
      );
      replyField.focus();
      return;
    }

    if (!topic || !reason || message.length < 10) {
      setStatus(
        statusNode,
        'error',
        'Pick a topic, pick a reason, and write a short message before opening the draft.',
      );
      return;
    }

    const recipient = decodeMailbox(CONTACT_MAILBOXES[config.recipient]);
    const reasonLabel = findReasonLabel(config, reason);
    const subject = `${context.subjectPrefix} ${config.label}: ${reasonLabel}`;
    const body = [
      `Topic: ${config.label}`,
      `Reason: ${reasonLabel}`,
      `Name: ${name || 'Not provided'}`,
      `Reply email: ${replyEmail || 'Use the sender address from this draft'}`,
      `Page: ${window.location.pathname}`,
      '',
      'Message:',
      message,
    ].join('\n');

    window.location.href =
      `mailto:${recipient}?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body.slice(0, 3200))}`;

    setStatus(
      statusNode,
      'success',
      'Your email app should open with a ready-to-send draft.',
    );
  });
});
