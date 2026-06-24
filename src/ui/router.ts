export type Route =
	| { name: 'dashboard' }
	| { name: 'pipeline' }
	| { name: 'clients' }
	| { name: 'projects' }
	| { name: 'client'; path: string }
	| { name: 'project'; path: string }
	| { name: 'deal'; path: string };

export type Go = (route: Route) => void;
