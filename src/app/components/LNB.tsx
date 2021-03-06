import { getSolidBackgroundColorRGBString } from 'app/services/commonUI/selectors';
import { RidiSelectState } from 'app/store';
import * as classNames from 'classnames';
import { assignIn, flow, omit } from 'lodash-es';
import * as qs from 'qs';
import * as React from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';

interface MenuStateProps {
  solidBackgroundColorRGBString: string;
  currentPathname: string;
  currentSearch: string;
  lastSelectedCategoryId?: number;
}

interface Menu {
  name: string;
  classname: string;
  pathname: string;
  pathRegExp: RegExp;
  defaultSearch?: {
    searchKey: string,
    propKeyForValue: keyof MenuStateProps,
  };
}

const menus: Menu[] = [
  {
    name: '홈',
    classname: 'Home',
    pathname: '/home',
    pathRegExp: /\/home/,
  },
  {
    name: '최신 업데이트',
    classname: 'RecentUpdates',
    pathname: '/new-releases',
    pathRegExp: /\/new-releases(\/.+)?/,
  },
  {
    name: '카테고리',
    classname: 'Categories',
    pathname: '/categories',
    pathRegExp: /\/categories(\/.+)?/,
    defaultSearch: {
      searchKey: 'id',
      propKeyForValue: 'lastSelectedCategoryId',
    },
  },
  {
    name: '마이 셀렉트',
    classname: 'MySelect',
    pathname: '/my-select',
    pathRegExp: /\/my-select/,
  },
];

function getLNBMenuSearch(menu: Menu, props: MenuStateProps) {
  const { currentPathname, currentSearch } = props;
  return flow(
    (search: string) => qs.parse(search, { ignoreQueryPrefix: true }),
    (parsedSearch: object) => menu.defaultSearch ?
        assignIn(
          parsedSearch,
          { [menu.defaultSearch.searchKey]: props[menu.defaultSearch.propKeyForValue] },
        ) :
        parsedSearch,
    (searchObject: object) => qs.stringify(searchObject, { addQueryPrefix: true }),
  )(currentPathname === menu.pathname ? currentSearch : '');
}

export const LNB: React.SFC<MenuStateProps> = (props) => {
  const { currentPathname, solidBackgroundColorRGBString } = props;
  return (
    <nav
      className="LnbMenu_Wrapper"
      style={{ backgroundColor: solidBackgroundColorRGBString }}
    >
      <h2 className="a11y">메인 메뉴</h2>
      <ul className="LnbMenu_List">
        {menus.map((menu) => (
          <li className={`LnbMenu LnbMenu_${menu.classname}`} key={menu.pathname}>
            <Link
              className={classNames(['LnbMenu_Link', !!currentPathname.match(menu.pathRegExp) && 'LnbMenu_Link-active'])}
              to={{
                pathname: menu.pathname,
                search: getLNBMenuSearch(menu, props),
              }}
            >
              <h3 className="reset-heading">{menu.name}</h3>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};

const mapStateToProps = (state: RidiSelectState): MenuStateProps => {
  return {
    solidBackgroundColorRGBString: getSolidBackgroundColorRGBString(state),
    currentPathname: state.router.location!.pathname,
    currentSearch: state.router.location!.search,
    lastSelectedCategoryId: state.categories.lastSelectedCategoryId,
  };
};

export const ConnectedLNB = connect(mapStateToProps)(LNB);
