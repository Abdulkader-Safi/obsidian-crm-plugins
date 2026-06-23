export type Route =
	| { name: 'dashboard' }
	| { name: 'clients' }
	| { name: 'client'; path: string };

export type Go = (route: Route) => void;
