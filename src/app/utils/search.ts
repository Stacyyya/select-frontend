const LOCAL_STORAGE_KEY = 'rs.search';

export interface SearchLocalStorageData {
  history: {
    enabled: boolean;
    keywordList: string[];
  };
}

export const removeFromArray = (targetArray: any[], targetValue: any): any[] => {
  return targetArray.filter((element: any) => element !== targetValue);
};

export const localStorageManager = (() => ({
  load: (): SearchLocalStorageData => {
    const localStorageData = localStorage.getItem(LOCAL_STORAGE_KEY) || '';
    const parsedLocalStorageData = localStorageData === '' ? {
      enabled: true,
      keywordList: [],
    } : JSON.parse(localStorageData).history;
    const parseData: SearchLocalStorageData = {
      history: {
        enabled: (parsedLocalStorageData.enabled !== undefined) && (parsedLocalStorageData.enabled !== null) ?
          parsedLocalStorageData.enabled :
          true,
        keywordList: parsedLocalStorageData.keywordList ? parsedLocalStorageData.keywordList : [],
      },
    };
    return {
      history: parseData.history,
    };
  },
  save: (state: SearchLocalStorageData): void => {
    const newData: SearchLocalStorageData = localStorageManager.load();
    newData.history = {
      enabled: state.history.enabled,
      keywordList: state.history.keywordList,
    };
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newData));
    } catch (e) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  },
}))();

export function getAuthorsCount(authors?: string): number {
  return authors ? authors.split(', ').length : 0;
}

export function getSortedAuthorsHtmlString(authors: string, totalAuthorsCount: number, count: number = 2): string {
  const redundantCount = totalAuthorsCount - count;
  return authors
    .split(', ')
    .filter((str: string) => str.length > 0)
    .sort((a, b) => {
      if (/<strong.+<\/strong>/.test(a)) {
        return -1;
      } else if (/<strong.+<\/strong>/.test(b)) {
        return 1;
      } else {
        return 0;
      }
    })
    .slice(0, count)
    .join(', ')
    .concat(redundantCount > 0 ? ` 외 ${redundantCount}명` : '');
}
