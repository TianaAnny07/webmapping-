// Mini « bus » : le bouton rouge Urgence de la barre de navigation

let handler: (() => void) | null = null;

export const emergencyBus = {
  set(fn: () => void) {
    handler = fn;
  },
  clear() {
    handler = null;
  },
  trigger() {
    if (handler) handler();
  },
};
