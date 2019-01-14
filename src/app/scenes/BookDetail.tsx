import * as isWithinRange from 'date-fns/is_within_range';
import * as classNames from 'classnames';
import { some } from 'lodash-es';
import * as React from 'react';
import { Helmet } from 'react-helmet';
import LazyLoad, { forceCheck } from 'react-lazyload';
import { connect, MapDispatchToProps } from 'react-redux';
import MediaQuery from 'react-responsive';
import { RouteComponentProps, withRouter } from 'react-router';
import * as qs from 'qs';
// tslint:disable-next-line
const Vibrant = require('node-vibrant');

import { Button, Icon } from '@ridi/rsg';
import { ConnectedInlineHorizontalBookList } from 'app/components/InlineHorizontalBookList';
import { FetchStatusFlag } from 'app/constants';
import {
  Book,
  BookAuthors,
  BookOwnershipStatus,
  BookReviewSummary,
  BookThumbnailUrlMap,
  BookTitle,
  BookAuthor,
  formatFileSize,
} from 'app/services/book';
import { Actions } from 'app/services/book';
import { TextTruncate } from 'app/services/book/components/TextTruncate';
import { Expander } from 'app/services/book/components/Expander';
import { Publisher, BookFile, BookDetailPublishingDate, NoticeResponse } from 'app/services/book/requests';
import { GNB_DEFAULT_COLOR, RGB, GNBColorLevel, Actions as CommonUIActions } from 'app/services/commonUI';
import { MySelectState } from 'app/services/mySelect';
import {
  ActionAddMySelectRequest,
  addMySelectRequest,
} from 'app/services/mySelect/actions';
import { ConnectedReviews } from 'app/services/review';
import { StarRating } from 'app/services/review/components';
import { RidiSelectState } from 'app/store';
import { BookId, TextWithLF } from 'app/types';
import { downloadBooksInRidiselect, readBooksInRidiselect } from 'app/utils/downloadUserBook';
import { BookDetailPlaceholder } from 'app/placeholder/BookDetailPlaceholder';
import { buildOnlyDateFormat } from 'app/utils/formatDate';
import { thousandsSeperator } from 'app/utils/thousandsSeperator';
import { INITIAL_STATE as EnvironmentState } from 'app/services/environment';
import { stringifyAuthors } from 'app/utils/utils';
import { withThumbnailQuery } from 'app/utils/withThumbnailQuery';
import { Category } from 'app/services/category';
import { ConnectedPageHeader } from 'app/components';
import { BookDetailSectionPlaceholder } from 'app/services/book/components/BookDetailSectionPlaceholder';
import { getSolidBackgroundColorRGBString, getTransparentBackgroundColorRGBString, getBackgroundColorGradientToLeft, getBackgroundColorGradientToRight } from 'app/services/commonUI/selectors';

interface BookDetailStateProps {
  bookId: BookId;
  isSubscribing: boolean;
  hasSubscribedBefore: boolean;
  fetchStatus: FetchStatusFlag;
  isFetched: boolean;
  isLoggedIn: boolean;

  title?: BookTitle;
  authors?: BookAuthors;
  reviewSummary?: BookReviewSummary;
  thumbnail?: BookThumbnailUrlMap;

  previewAvailable: boolean;
  hasPreview: boolean;
  previewBId: BookId;

  categories?: Category[][];
  file?: BookFile;
  seriesBookList?: Book[];
  publisherReview?: TextWithLF;
  authorIntroduction?: TextWithLF;
  introduction?: TextWithLF;
  introImageUrl?: string;
  introVideoUrl?: string;
  tableOfContents?: TextWithLF;
  noticeList?: Array<NoticeResponse>;
  publisher?: Publisher;
  publishingDate?: BookDetailPublishingDate;
  dominantColor?: RGB;

  mySelect: MySelectState;
  env: typeof EnvironmentState;
  gnbColorLevel: GNBColorLevel;
  solidBackgroundColorRGBString: string;
  transparentBackgroundColorRGBString: string;
  backgroundColorGradientToRight: string;
  backgroundColorGradientToLeft : string;

  ownershipFetchStatus?: FetchStatusFlag;
  ownershipStatus?: BookOwnershipStatus;
}

type RouteProps = RouteComponentProps<{
  bookId: string;
}>;

type OwnProps = RouteProps & {};

type Props = ReturnType<typeof mapDispatchToProps> & BookDetailStateProps & OwnProps;

interface State {
  thumbnailExapnded: boolean;
  isAuthorsExpanded: boolean;
  seriesListExpanded: boolean;
}

export class BookDetail extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.checkAuth = this.checkAuth.bind(this);
  }

  public state = {
    thumbnailExapnded: false,
    isAuthorsExpanded: false,
    seriesListExpanded: false
  };

  private updateDominantColor = (props: Props) => {
    const {
      dominantColor,
      thumbnail,
      dispatchUpdateDominantColor,
      dispatchUpdateGNBColor,
      bookId
    } = props;
    if (!thumbnail) {
      return;
    }
    if (!dominantColor || dominantColor.r === undefined) {
      try {
        Vibrant.from(withThumbnailQuery(thumbnail.large!)).getPalette((err: any, palette: any) => {
          if (!palette) {
            return;
          }
          const tempRGB: any =
            /*
             * actually it is Swatch type class instance and uses get r() for r, g, b properties
             * needs to be transformed since it is going to be stored after JSON.stringify()
            */
            palette.DarkVibrant ||
            palette.Vibrant ||
            palette.LightMuted ||
            GNB_DEFAULT_COLOR;
          const rgb = {
            r: tempRGB.r,
            g: tempRGB.g,
            b: tempRGB.b,
          }
          dispatchUpdateGNBColor(rgb);
          dispatchUpdateDominantColor(bookId, rgb);
        });
      } catch (e) {
        dispatchUpdateGNBColor(GNB_DEFAULT_COLOR);
      }
    } else {
      dispatchUpdateGNBColor(dominantColor);
    }
  };

  private handleDownloadButtonClick = () => {
    const { env, bookId } = this.props;
    if (this.shouldDisplaySpinnerOnDownload()) {
      return;
    }
    if (this.canDownload()) {
      if (env.platform.isRidibooks) {
        readBooksInRidiselect(bookId);
        return;
      }
      if (!this.currentBookExistsInMySelect() && !confirm('리디북스에서 이미 구매/대여한 책입니다.\n다운로드하시겠습니까?')) {
        return;
      }
      downloadBooksInRidiselect([bookId]);
    } else {
      this.props.dispatchAddMySelect(bookId);
    }
  };

  private canDownload = () =>
    (!!this.props.ownershipStatus && this.props.ownershipStatus.isDownloadAvailable);


  private currentBookExistsInMySelect = () =>
    (!!this.props.ownershipStatus && this.props.ownershipStatus.isCurrentlyUsedRidiSelectBook);

  private shouldDisplaySpinnerOnDownload = () =>
    (this.props.isLoggedIn && !this.props.ownershipStatus) ||
    this.props.ownershipFetchStatus === FetchStatusFlag.FETCHING ||
    this.props.mySelect.additionFetchStatus === FetchStatusFlag.FETCHING;

  private fetchBookDetailAndOwnership = (props: Props) => {
    if (!props.isFetched) {
      props.dispatchLoadBookRequest(props.bookId);
    }
    if (!props.ownershipStatus && props.isLoggedIn) {
      props.dispatchLoadBookOwnershipRequest(props.bookId);
    }
  };

  public componentDidMount() {
    this.fetchBookDetailAndOwnership(this.props);
    this.updateDominantColor(this.props);
    requestAnimationFrame(forceCheck);
  }
  public componentWillReceiveProps(nextProps: Props) {
    if (this.props.bookId !== nextProps.bookId) {
      this.updateDominantColor(nextProps);
      this.fetchBookDetailAndOwnership(nextProps);
    }
    if (
      (!this.props.thumbnail && nextProps.thumbnail) ||
      (!this.props.isFetched && nextProps.isFetched)
    ) {
      this.updateDominantColor(nextProps);
    }
  }
  public componentWillUnmount() {
    this.props.dispatchUpdateGNBColor(GNB_DEFAULT_COLOR);
  }

  public checkAuth() {
    if (this.props.isLoggedIn) {
      return true;
    }
    if (confirm('로그인이 필요합니다. 로그인 페이지로 이동하시겠습니까?')) {
      window.location.replace(`${ this.props.env.STORE_URL }/account/oauth-authorize?fallback=login&return_url=${window.location.href}`);
    }
    return false;
  }

  private renderDownloadButton = () => {
    const { isLoggedIn, isSubscribing, hasSubscribedBefore, env } = this.props;
    const { STORE_URL: BASE_URL_STORE } = this.props.env;
    const shouldDisplaySpinnerOnDownload = this.shouldDisplaySpinnerOnDownload();
    if (this.canDownload()) {
      return (
        <Button
          color="blue"
          size="large"
          spinner={shouldDisplaySpinnerOnDownload}
          className="PageBookDetail_DownloadButton"
          onClick={this.handleDownloadButtonClick}
        >
          {env.platform.isRidibooks ? '읽기' : '다운로드'}
        </Button>
      )
    } else if (isSubscribing) {
      return (
        <Button
          color="blue"
          size="large"
          spinner={shouldDisplaySpinnerOnDownload}
          className="PageBookDetail_DownloadButton"
          onClick={this.handleDownloadButtonClick}
        >
          {!shouldDisplaySpinnerOnDownload && <Icon name="check_6" />}
          마이 셀렉트에 추가
        </Button>
      )
    } else {
      // TODO: refactor to external utility function
      const queryString = qs.stringify(qs.parse(location.search, { ignoreQueryPrefix: true }), {
        filter: (prefix, value) => {
          if(~prefix.indexOf('utm_')) {
            return;
          }
          return value;
        },
        addQueryPrefix: true,
      });

      const paymentsUrl = `${BASE_URL_STORE}/select/payments?return_url=${location.origin + location.pathname + encodeURIComponent(queryString)}`;
      const paymentsWithAuthorizeUrl = `${BASE_URL_STORE}/account/oauth-authorize?fallback=signup&return_url=${paymentsUrl}`;
      return (
        <Button
          color="blue"
          size="large"
          spinner={shouldDisplaySpinnerOnDownload}
          className="PageBookDetail_DownloadButton PageBookDetail_DownloadButton-large"
          component="a"
          href={isLoggedIn ? paymentsUrl : paymentsWithAuthorizeUrl}
        >
          {hasSubscribedBefore ? '리디셀렉트 구독하기' : '구독하고 무료로 읽어보기'}
        </Button>
      )
    }
  }

  private renderAuthor() {
    const { authors } = this.props;
    const { isAuthorsExpanded } = this.state;
    if (!authors) {
      return '';
    }

    const hasMoreAuthors = some(authors, (people: BookAuthor[]) => (people && people.length > 2));
    if (isAuthorsExpanded || !hasMoreAuthors) {
      return stringifyAuthors(authors);
    }
    return (
      <button
        className="PageBookDetail_ExpandAuthors_Button"
        onClick={() => this.setState({ isAuthorsExpanded: true })}
      >
        {stringifyAuthors(authors, 2)}
        <Icon
          name="arrow_1_down"
          className="PageBookDetail_ExpandAuthors_Button_Icon"
        />
      </button>
    );
  }
  private renderMeta() {
    const {
      title,
      publisher,
      file,
      reviewSummary,
      gnbColorLevel,
      categories,
      previewAvailable,
      hasPreview,
      previewBId,
      isSubscribing,
      solidBackgroundColorRGBString,
    } = this.props;

    return (
      <>
        <Helmet>
          <title>{title && title.main ? `${title.main} - 리디셀렉트` : '리디셀렉트'}</title>
          <meta name="theme-color" content={solidBackgroundColorRGBString} />
        </Helmet>
        <MediaQuery maxWidth={840}>
          {isMobile => (
            <div className="PageBookDetail_Meta">
              <ul className="PageBookDetail_Categories">
                {categories &&
                  categories.map((categoryGroup, key) => {
                    return (
                      <li className="PageBookDetail_CategoryItem" key={key}>
                        {categoryGroup
                          .map((category, idx) => <span key={`${category.name}${idx}`}>
                            {category.name}
                            {idx !== categoryGroup.length - 1 && <Icon name="arrow_5_right" className="PageBookDetail_CategoryArrow" />}
                          </span>)
                        }
                      </li>
                    );
                  })}
              </ul>
              <h1 className="PageBookDetail_BookTitle">{title ? title.main : ''}</h1>
              <p className="PageBookDetail_BookElements">
                <span className="PageBookDetail_Authors">
                  {this.renderAuthor()}
                </span>
                {publisher && (
                  <span className="PageBookDetail_Publisher">{` · ${publisher.name} 출판`}</span>
                )}
                {file && file.format && file.format !== 'bom' && <span className="PageBookDetail_FileType">{`${file.format.toUpperCase()}`}</span>}
                {file && file.size &&
                  <span className={classNames(
                    'PageBookDetail_FileSize',
                    { 'PageBookDetail_FileSize-noFileType': file.format && file.format === 'bom' }
                  )}>
                    {`${file.format && file.format !== 'bom' ? ' · ' : ''}${formatFileSize(file.size)}`}
                  </span>
                }
              </p>
              <p className="PageBookDetail_RatingSummary">
                {reviewSummary && <>
                  <StarRating
                    rating={reviewSummary.buyerRatingAverage}
                    width={74}
                    darkBackground={!isMobile && gnbColorLevel !== GNBColorLevel.BRIGHT}
                  />
                  <span className="PageBookDetail_RatingSummaryAverage">{`${
                    reviewSummary.buyerRatingAverage
                    }점`}</span>
                  <span className="PageBookDetail_RatingSummaryCount">{`(${
                    thousandsSeperator(reviewSummary.buyerRatingCount)
                    }명)`}</span>
                </>}
              </p>
              <div className="PageBookDetail_DownloadWrapper">
                {isSubscribing && previewAvailable && hasPreview ? (
                  <Button
                  color={isMobile ? 'blue' : undefined}
                  outline={true}
                  size="large"
                  className="PageBookDetail_PreviewButton"
                  component="a"
                  href={`https://preview.ridibooks.com/books/${previewBId}?s=ridi_select`}
                >
                  <Icon name="book_1" />
                  <span className="PageBookDetail_PreviewButtonLabel">미리보기</span>
                </Button>
                ) : null}
                {this.renderDownloadButton()}
              </div>
            </div>
          )}
        </MediaQuery>
      </>
    );
  }
  private renderOverlays() {
    const { thumbnail, title, mySelect } = this.props;
    const { thumbnailExapnded } = this.state;

    return (
      <>
        {thumbnailExapnded && (
          <div
            className="PageBookDetail_ThumbnailPopup"
            onClick={() => this.setState({ thumbnailExapnded: false })}
          >
            <div className="PageBookDetail_ThumbnailPopupContent">
              <button
                className="PageBookDetail_ThumbnailPopupCloseBtn"
                onClick={() => this.setState({ thumbnailExapnded: false })}
              >
                <Icon name="close_2" />
              </button>
              <img
                className="PageBookDetail_ThumbnailPopupImg"
                src={`${thumbnail!.xxlarge}?dpi=xxhdpi`}
                alt={title!.main}
              />
            </div>
          </div>
        )}
      </>
    );
  }

  private getVideoSrc = (videoUrl: string): string | null => {
    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
      const token = videoUrl.match(/[\w-_]{10,}/);
      if (token) {
        return `//www.youtube-nocookie.com/embed/${token[0]}?rel=0`;
      }
    } else if (videoUrl.includes('vimeo')) {
      const token = videoUrl.match(/\d[\w-_]{7,}/);
      if (token) {
        return `//player.vimeo.com/video/${token[0]}?byline=0&amp;portrait=0&amp;badge=0`;
      }
    }
    return null;
  }

  private renderMovieTrailer = (videoUrl: string, isMobile: boolean) => {
    const videoSrc = this.getVideoSrc(videoUrl);
    return videoSrc ? (
      <section className={classNames(
        'PageBookDetail_Panel',
        { 'PageBookDetail_Panel-inMeta': isMobile },
      )}>
        <h2 className={isMobile ? 'a11y' : 'PageBookDetail_PanelTitle'}>북 트레일러</h2>
        <div className="PageBookDetail_PanelContent PageBookDetail_PanelContent-trailer">
          <iframe
            src={videoSrc}
            width={isMobile ? 300 : 800}
            height={isMobile ? 225 : 450}
            frameBorder="0"
            allowFullScreen
          />
        </div>
      </section>
    ) : null;
  }

  private renderNoticeList = (noticeList?: Array<NoticeResponse>) => {
    if (!noticeList || !noticeList.length) {
      return null;
    }
    return (
      <>
        <h2 className="a11y">도서 운영 정보</h2>
        <ul className="PageBookDetail_NoticeList">
          {noticeList.map((noticeItem) => (
            <li className="PageBookDetail_NoticeItem" key={noticeItem.id}>
              <p
                className="PageBookDetail_NoticeParagraph"
                dangerouslySetInnerHTML={{ __html: noticeItem.content.split('\n').join('<br />') }}
              />
            </li>
          ))}
        </ul>
      </>
    )
  }

  private renderPanelContent = (text: TextWithLF, isMobile: boolean) => {
    return (
      <TextTruncate
        lines={9}
        text={text}
        lineHeight={isMobile ? 23 : 25}
        renderExpander={(({ expand, isExpanded, isTruncated }) => !isTruncated || isExpanded ? null : (
          <div className="BookDetail_ContentTruncWrapper">
            <Expander
              onClick={expand}
              text="계속 읽기"
              isExpanded={false}
            />
          </div>
        ))}
      />
    )
  }
  public render() {
    const {
      bookId,
      thumbnail,
      tableOfContents,
      authorIntroduction,
      publishingDate,
      noticeList,
      introduction,
      introImageUrl,
      introVideoUrl,
      title,
      publisherReview,
      seriesBookList,
      isFetched,
      env,
      gnbColorLevel,
      solidBackgroundColorRGBString,
      transparentBackgroundColorRGBString,
      backgroundColorGradientToLeft,
      backgroundColorGradientToRight,
    } = this.props;
    const { seriesListExpanded } = this.state;

    if (!title || !title.main) {
      return <BookDetailPlaceholder />;
    }
    return (
      <MediaQuery maxWidth={840}>
        {isMobile => (
          <main className="SceneWrapper PageBookDetail">
            {env.platform.isRidibooks && <ConnectedPageHeader pageTitle={title.main} />}
            <div
              className={`PageBookDetail_Header PageBookDetail_Header-${gnbColorLevel}`}
              style={{ background: solidBackgroundColorRGBString, }}
            >
              <span
                className="PageBookDetail_HeaderBackground"
                style={{ backgroundImage: `url(${thumbnail ? `${thumbnail.xxlarge}?dpi=xxhdpi` : ''})` }}
              >
                <span className="Left_GradientOverlay" style={{ background: backgroundColorGradientToRight, }} />
                <span className="Right_GradientOverlay" style={{ background: backgroundColorGradientToLeft, }} />
              </span>
              <div className="PageBookDetail_HeaderMask" style={{ backgroundColor: transparentBackgroundColorRGBString, }}>
                <div className="PageBookDetail_HeaderContent">
                  <div className="PageBookDetail_ThumbnailWrapper">
                    <button
                      className="PageBookDetail_ThumbnailButton"
                      onClick={() => this.setState({ thumbnailExapnded: true })}
                    >
                      {thumbnail && (
                        <img
                          className="PageBookDetail_Thumbnail"
                          src={`${thumbnail.xxlarge}?dpi=xxhdpi`}
                          alt={title!.main}
                        />
                      )}
                    </button>
                  </div>
                  {!isMobile && this.renderMeta()}
                </div>
              </div>
            </div>
            {!isMobile &&
              !!noticeList &&
              !!noticeList.length && (
                <section className="PageBookDetail_Panel PageBookDetail_Panel-notice">
                  {this.renderNoticeList(noticeList)}
                </section>
            )}
            {!isMobile && introVideoUrl && this.renderMovieTrailer(introVideoUrl, isMobile)}
            {isMobile &&
              <section className="PageBookDetail_Panel">
                {this.renderMeta()}
                {this.renderNoticeList(noticeList)}
                {introVideoUrl && this.renderMovieTrailer(introVideoUrl, isMobile)}
              </section>
            }
            {introduction ? (
              <section className="PageBookDetail_Panel">
                <h2 className="PageBookDetail_PanelTitle">책 소개</h2>
                <div className="PageBookDetail_PanelContent">
                  {this.renderPanelContent(`${introImageUrl ? `<img src="${introImageUrl}" /><br /><br />` : ''}${introduction}`, isMobile)}
                </div>
              </section>
            ) : <BookDetailSectionPlaceholder />}
            {seriesBookList &&
              seriesBookList.length > 0 && (
                <section className="PageBookDetail_Panel">
                  <h2 className="PageBookDetail_PanelTitle">이 책의 시리즈</h2>
                  <div className="PageBookDetail_PanelContent">
                    <ConnectedInlineHorizontalBookList
                      pageTitleForTracking="book-detail"
                      uiPartTitleForTracking="series-list"
                      disableInlineOnPC={seriesListExpanded}
                      books={seriesBookList!}
                      lazyloadThumbnail={false}
                    />
                    {!seriesListExpanded && seriesBookList.length > 6 &&
                      !isMobile && (
                        <div className="BookDetail_ContentTruncWrapper">
                          <Expander
                            onClick={() => {
                              this.setState({ seriesListExpanded: true });
                            }}
                            text="펼쳐 보기"
                            isExpanded={seriesListExpanded}
                          />
                        </div>
                      )}
                  </div>
                </section>
              )}
            {publisherReview && (
              <section className="PageBookDetail_Panel">
                <h2 className="PageBookDetail_PanelTitle">출판사 서평</h2>
                <div className="PageBookDetail_PanelContent">
                  {this.renderPanelContent(publisherReview, isMobile)}
                </div>
              </section>
            )}
            {authorIntroduction && (
              <section className="PageBookDetail_Panel">
                <h2 className="PageBookDetail_PanelTitle">저자 소개</h2>
                <div className="PageBookDetail_PanelContent">
                  {this.renderPanelContent(authorIntroduction, isMobile)}
                </div>
              </section>
            )}
            {tableOfContents && (
              <section className="PageBookDetail_Panel">
                <h2 className="PageBookDetail_PanelTitle">목차</h2>
                <div className="PageBookDetail_PanelContent">
                  {this.renderPanelContent(tableOfContents, isMobile)}
                </div>
              </section>
            )}
            {publishingDate && (publishingDate.ebookPublishDate || publishingDate.paperBookPublishDate) && (
              <section className="PageBookDetail_Panel">
                <h2 className="PageBookDetail_PanelTitle">출간일</h2>
                <div className="PageBookDetail_PanelContent">
                  {publishingDate.ebookPublishDate === publishingDate.paperBookPublishDate
                    ? (
                      `${buildOnlyDateFormat(publishingDate.ebookPublishDate)} 전자책, 종이책 동시 출간`
                    )
                    : <>
                      {publishingDate.ebookPublishDate && <>{buildOnlyDateFormat(publishingDate.ebookPublishDate)} 전자책 출간<br /></>}
                      {publishingDate.paperBookPublishDate && `${buildOnlyDateFormat(publishingDate.paperBookPublishDate)} 종이책 출간`}
                    </>
                  }
                </div>
              </section>
            )}
            <section className="PageBookDetail_Panel Reviews_Wrapper">
              <h2 className="a11y">리뷰</h2>
              <LazyLoad height={200} once={true} offset={400}>
                <ConnectedReviews
                  bookId={bookId}
                  checkAuth={this.checkAuth}
                />
              </LazyLoad>
            </section>
            {isFetched && this.renderOverlays()}
          </main>
        )}
      </MediaQuery>
    );
  }
}

const mapStateToProps = (state: RidiSelectState, ownProps: OwnProps): BookDetailStateProps => {
  const bookId = Number(ownProps.match.params.bookId);
  const stateExists = !!state.booksById[bookId];
  const bookState = state.booksById[bookId];
  const book = stateExists ? bookState.book : undefined;
  const bookDetail = stateExists ? bookState.bookDetail : undefined;

  return {
    bookId,
    isSubscribing: state.user.isSubscribing,
    isLoggedIn: state.user.isLoggedIn,
    hasSubscribedBefore: state.user.hasSubscribedBefore,
    fetchStatus: FetchStatusFlag.IDLE,
    isFetched: stateExists && bookState.isDetailFetched,
    ownershipStatus: stateExists ? bookState.ownershipStatus : undefined,
    ownershipFetchStatus: stateExists ? bookState.ownershipFetchStatus : undefined,
    dominantColor: stateExists ? bookState.dominantColor : undefined,

    // Data that can be pre-fetched in home
    title: !!bookDetail ? bookDetail.title : !!book ? book.title : undefined,
    authors: !!bookDetail ? bookDetail.authors : !!book ? book.authors : undefined,
    thumbnail: !!bookDetail ? bookDetail.thumbnail : !!book ? book.thumbnail : undefined,
    reviewSummary: !!bookDetail
      ? bookDetail.reviewSummary
      : !!book
        ? book.reviewSummary
        : undefined,
    previewAvailable: !!bookDetail ? bookDetail.previewAvailable : false,
    hasPreview: !!bookDetail ? bookDetail.hasPreview : false,
    previewBId: !!bookDetail ? bookDetail.previewBId : bookId,

    introduction: !!bookDetail ? bookDetail.introduction : undefined,
    introImageUrl: !!bookDetail ? bookDetail.introImageUrl : undefined,
    introVideoUrl: !!bookDetail ? bookDetail.introVideoUrl : undefined,
    categories: !!bookDetail ? bookDetail.categories : undefined,
    authorIntroduction: !!bookDetail ? bookDetail.authorIntroduction : undefined,
    tableOfContents: !!bookDetail ? bookDetail.tableOfContents : undefined,
    seriesBookList: !!bookDetail ? bookDetail.seriesBooks : undefined,
    publisherReview: !!bookDetail ? bookDetail.publisherReview : undefined,
    publisher: !!bookDetail ? bookDetail.publisher : undefined,
    publishingDate: !!bookDetail ? bookDetail.publishingDate : undefined,
    noticeList: !!bookDetail && !!bookDetail.notices && Array.isArray(bookDetail.notices) ?
      bookDetail.notices.filter((notice) =>
        notice.isVisible && isWithinRange(new Date(), notice.beginDatetime, notice.endDatetime)
      ): undefined,
    file: !!bookDetail ? bookDetail.file : undefined,
    mySelect: state.mySelect,
    env: state.environment,
    gnbColorLevel: state.commonUI.gnbColorLevel,
    solidBackgroundColorRGBString: getSolidBackgroundColorRGBString(state),
    transparentBackgroundColorRGBString: getTransparentBackgroundColorRGBString(state),
    backgroundColorGradientToLeft: getBackgroundColorGradientToLeft(state),
    backgroundColorGradientToRight: getBackgroundColorGradientToRight(state),
  };
};

const mapDispatchToProps = (dispatch: any) => {
  return {
    dispatchLoadBookRequest: (bookId: number) => dispatch(Actions.loadBookDetailRequest({ bookId })),
    dispatchUpdateGNBColor: (color: RGB) => dispatch(CommonUIActions.updateGNBColor({ color })),
    dispatchUpdateDominantColor: (bookId: number, color: RGB) =>
      dispatch(Actions.updateDominantColor({ bookId, color })),
    dispatchLoadBookOwnershipRequest: (bookId: number) =>
      dispatch(Actions.loadBookOwnershipRequest({ bookId })),
    dispatchAddMySelect: (bookId: BookId) => dispatch(addMySelectRequest(bookId)),
  };
};

export const ConnectedBookDetail = withRouter(
  connect(mapStateToProps, mapDispatchToProps)(BookDetail)
);
