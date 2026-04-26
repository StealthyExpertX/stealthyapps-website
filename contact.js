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

const CONTACT_TOPICS = {
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
};

function decodeChars(values = []) {
  return String.fromCharCode(...values);
}

function decodeMailbox(mailbox) {
  return `${decodeChars(mailbox.local)}@${decodeChars(mailbox.domain)}.${decodeChars(mailbox.tld)}`;
}

function buildReasonOptions(topic) {
  const config = CONTACT_TOPICS[topic] || CONTACT_TOPICS.support;
  return config.reasons
    .map(([value, label]) => `<option value="${value}">${label}</option>`)
    .join('');
}

function findReasonLabel(topic, reasonValue) {
  const config = CONTACT_TOPICS[topic] || CONTACT_TOPICS.support;
  const match = config.reasons.find(([value]) => value === reasonValue);
  return match ? match[1] : config.reasons[0][1];
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('[data-contact-form]');
  if (!form) {
    return;
  }

  const topicField = document.querySelector('#contactTopic');
  const reasonField = document.querySelector('#contactReason');
  const recipientNote = document.querySelector('[data-recipient-note]');
  const statusNode = document.querySelector('[data-contact-status]');

  function updateTopicState() {
    const config = CONTACT_TOPICS[topicField.value] || CONTACT_TOPICS.support;
    reasonField.innerHTML = buildReasonOptions(topicField.value);
    recipientNote.textContent = `${config.inboxLabel} selected.`;
    statusNode.dataset.state = 'idle';
    statusNode.textContent =
      'This opens a prefilled draft in your default email app. Nothing gets sent from this site.';
  }

  topicField.addEventListener('change', updateTopicState);
  updateTopicState();

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const topic = topicField.value;
    const reason = reasonField.value;
    const message = form.contactMessage.value.trim();
    const replyEmail = form.contactReply.value.trim();
    const name = form.contactName.value.trim();

    if (!topic || !reason || message.length < 10) {
      statusNode.dataset.state = 'error';
      statusNode.textContent =
        'Pick a topic, pick a reason, and write a short message before opening the draft.';
      return;
    }

    const config = CONTACT_TOPICS[topic] || CONTACT_TOPICS.support;
    const recipient = decodeMailbox(CONTACT_MAILBOXES[config.recipient]);
    const reasonLabel = findReasonLabel(topic, reason);
    const subject = `FillPro ${config.label}: ${reasonLabel}`;
    const body = [
      `Topic: ${config.label}`,
      `Reason: ${reasonLabel}`,
      `Name: ${name || 'Not provided'}`,
      `Reply email: ${replyEmail || 'Use the sender address from this draft'}`,
      '',
      'Message:',
      message,
    ].join('\n');

    window.location.href =
      `mailto:${recipient}?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body.slice(0, 3200))}`;

    statusNode.dataset.state = 'success';
    statusNode.textContent =
      'Your email app should open with a ready-to-send draft.';
  });
});
