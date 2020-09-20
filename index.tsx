import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView } from '@tarojs/components'

import Loading from '@/components/Loading';

import { stateHandler } from '@/utils';

import './index.less';

type EmptyArray = Array<any>;

const refresherThreshold = 5;
let startFlag = 0;
let flag = 0;
let canRefresh = true;
let refreshFlag = false;
let refreshOnlyFlag = false;

interface IAnyObject {
  [key: string]: any;
}

interface IHListView {
  init: () => Promise<IAnyObject[]>;
  onFetchMore: (index: number) => Promise<IAnyObject[]>;
  onRefresh: () => Promise<IAnyObject[]>;
  renderItem: (item: any, index: number) => JSX.Element;
  onFetchError?: (e: Error) => Promise<IAnyObject[]>;
  emptyHolder?: undefined | JSX.Element;
  emptyText?: string;
  fetchMoreThreshold?: number;
  autoFetchMore?: boolean;
}

const initialState = {
  initLoading: true,
  moreLoading: false,
  refreshLoading: false,
  list: [],
  index: 1,
  hasMore: true,
  slidingDistance: 0,
  refreshText: '继续下拉即可刷新',
};

const HListView = (props: IHListView) => {
  const [state, setState] = useState(initialState);

  const { initLoading, moreLoading, refreshLoading, list, index, hasMore, slidingDistance, refreshText } = state;

  const toSetState = stateHandler(setState);

  useEffect(() => {
    props.init().then((res) => {
      toSetState({
        initLoading: false,
        list: res,
      })
    });
    return () => {
      startFlag = 0;
      flag = 0;
      canRefresh = true;
      refreshFlag = false;
      refreshOnlyFlag = false;
    };
  }, []);

  const toRefreshData = async () => {
    toSetState({ refreshLoading: true });
    try {
      const newData: EmptyArray = await props.onRefresh();
      if (newData?.length > 0) {
        toSetState({
          refreshLoading: false,
          index: 1,
          hasMore: true,
          list: newData || [],
        });
      } else {
        toSetState({
          refreshLoading: false,
        });
      }
    } catch (error) {
      if (props.onFetchError) {
        props.onFetchError(error);
      }
      toSetState({
        refreshLoading: false,
      });
    }
  }

  const toFetchMore = async () => {
    toSetState({ moreLoading: true });
    try {
      const newData: EmptyArray = await props.onFetchMore(index + 1);
      if (newData?.length > 0) {
        toSetState(prevState => ({
          moreLoading: false,
          index: prevState.index + 1,
          list: newData?.length > 0 ? prevState.list.concat(newData) : prevState.list,
        }));
      } else if (newData?.length === 0) {
        toSetState({
          moreLoading: false,
          hasMore: false,
        })
      } else {
        toSetState({
          moreLoading: false,
        });
      }
    } catch (error) {
      if (props.onFetchError) {
        props.onFetchError(error);
      }
      toSetState({
        moreLoading: false,
      });
    }
  }

  const onTouchStart = (e) => {
    startFlag = e?.touches[0]?.clientY;
  }

  const onTouchEnd = async (e) => {
    if (!refreshFlag) {
      toSetState({
        slidingDistance: 0,
      })  
    }
  }

  const onTouchMove = async (e) => {
    flag = e?.touches[0]?.clientY - startFlag;
    refreshFlag = flag > refresherThreshold;
    if (flag > 0 && canRefresh) {
      if (refreshFlag) {
        if (!refreshOnlyFlag) {
          refreshOnlyFlag = true;
          toSetState({
            slidingDistance: refresherThreshold + 30,
          })
          await toRefreshData();
          toSetState({
            refreshText: '刷新完成',
          })
          setTimeout(() => {
            toSetState({
              refreshText: '继续下拉即可刷新',
              slidingDistance: 0,
            })
            refreshOnlyFlag = false;
          }, 1000);
        }
      } else {
        toSetState({
          slidingDistance: flag,
        })
      }
    }
  }

  const onScrollToLower = props.autoFetchMore !== false && hasMore ? toFetchMore : () => {};

  const onScroll = (e) => {
    canRefresh = e.detail?.scrollTop === 0;
  }

  return (
    <ScrollView 
      className='hdz-list-view' 
      scrollY 
      scrollWithAnimation 
      enableFlex 
      enableBackToTop 
      lowerThreshold={props.fetchMoreThreshold || 100} 
      onScroll={onScroll}
      onScrollToLower={onScrollToLower} 
      onTouchStart={onTouchStart} 
      onTouchEnd={onTouchEnd} 
      onTouchMove={onTouchMove}
    >
      <View className={`hdz-list-view-refresh ${refreshLoading ? 'refreshing' : ''}`}>
        {initLoading || refreshLoading ? (
          <Loading size={24} />
        ) : (
          <Text className='hdz-list-view-more-text'>{refreshText}</Text>
        )}
      </View>
      <View className='hdz-list-view-content' style={{ transform: `translateY(${slidingDistance}px)` }}>
        {list?.length === 0 ? props.emptyHolder ?? <Text className='hdz-list-view-more-text'>{props.emptyText || '暂无数据'}</Text> : list?.map(props.renderItem)}
      </View>
      <View className='hdz-list-view-more'>
        {list?.length === 0 ? (
          <></>
        ) : moreLoading ? (
          <Loading size={24} />
        ) : hasMore ? (
          <Text className='hdz-list-view-more-text' onClick={toFetchMore}>查看更多</Text>
        ) : (
          <Text className='hdz-list-view-more-text'>我也是有底线的</Text>
        )}
      </View>
    </ScrollView>
  );
};

export default HListView;