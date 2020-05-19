import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { getResult, getCards, getGame, getDeck } from '../api/api'
import useInterval from '../hooks/useInterval'
import DeckList from '../components/DeckList'
import { UPDATE_FREQUENCY } from '../lib/constants'
import { Redirect, withRouter } from 'react-router-dom'
import storage from 'electron-json-storage'
import { getOppRegions, getOppChampions } from '../lib/opponent'
import { parse } from '../lib/timeParser'

const Game = (props) => {
    const [gameId, setGameId] = useState(-100000)
    const [timeElapsed, updateTime] = useState(0) // time elapsed of a game in seconds
    const [gameActive, setGameActive] = useState(true)
    const [cardsSet, setCardsSet] = useState([])
    const [localCards, setLocalCards] = useState([])
    const [opponentCards, setOpponentCards] = useState([])
    const [localDeck, setLocalDeck] = useState('')
    const data = props.location.state.data

    useEffect(() => {
        const getGameID = async () => {
            const previousGame = await getResult()
            setGameId(Number(previousGame.data.GameID) + 1)
        }
        const getSet = async () => {
            const cards = await getCards()
            setCardsSet(cards)
        }
        const getLocalDeck = async () => {
            const deck = await getDeck()
            setLocalDeck(deck.data.DeckCode)
        }
        getGameID()
        getSet()
        getLocalDeck()
    }, [])

    useInterval(() => updateTime(prevTime => prevTime + 1), 1000)
    useInterval(() => {
        const getGameResult = async () => {
            const result = await getResult()
            if (gameId > -1 && result.data.GameID === gameId) {
                const gameResult = {
                    won: result.data.LocalPlayerWon,
                    deck: localDeck,
                    opponentRegions: getOppRegions(),
                    opponentChampions: getOppChampions(),
                    duration: timeElapsed,
                    timestamp: + new Date(),
                    opponentName: data.OpponentName
                }
                storage.get('history', (err, history) => {
                    console.log('saved match to history... success: ', err)
                    if (!err) {
                        if (history) storage.set('history', [...history, gameResult], e => setGameActive(false))
                        else storage.set('history', [gameResult], e => setGameActive(false))
                    }
                    else setGameActive(false)
                })
            }
        }
        const updateCards = async () => {
            const result = await getGame()
            const currentCards = result.data.Rectangles
            let localPlayed = [], opponentPlayed = []
            currentCards.forEach(card => {
                if (card.CardCode !== 'face') {
                    if (card.LocalPlayer) {
                        if (card.TopLeftY < 100 && !localCards.find(localCard => localCard.id === card.CardID))
                            localPlayed.push({ id: card.CardID, code: card.CardCode })
                    }
                    else {
                        if (!opponentCards.find(opponentCard => opponentCard.id === card.CardID))
                            localPlayed.push({ id: card.CardID, code: card.CardCode })
                    }
                }
            })
            setLocalCards([...localCards, ...localPlayed])
            setOpponentCards([...opponentCards, ...opponentPlayed])
        }
        getGameResult()
        updateCards()
    }, UPDATE_FREQUENCY)

    const gameTime = parse(timeElapsed)
    return gameActive ?
        <Column>
            <Info>
                <div>{gameTime}</div>
                <Players>
                    <span>{data.PlayerName}</span>
                    <span>vs</span>
                    <span>{data.OpponentName}</span>
                </Players>
            </Info>
            {localDeck && cardsSet && <DeckList deckCode={localDeck} cardsDrawn={localCards} cardsSet={cardsSet} />}
        </Column>
        :
    <Redirect to="/home" />
}

export default withRouter(Game)

const Column = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 8px;
`
const Info = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
`
const Players = styled.div`
    display: flex;
    font-size: 18px;
    > span:nth-child(2) { margin: 0 6px }
`
