/**
 * Host half.
 *
 * Detection and display both live in the Client half: the Client can observe
 * session running state and pending approval/question interactions through
 * `ctx.uiSession.sessionStatus`, and Electron renders a Web Notification as a
 * native Windows toast. No host service is needed.
 */
export const name = 'dsh-notify';

export function apply() {}
