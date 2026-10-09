import { describe, it, expect } from 'vitest'
import { checkSafety } from '../src/main/safety/rules'

describe('checkSafety', () => {
  it.each([
    ['gusto ko nang mamatay', 'crisis'],
    ['ayoko nang mabuhay', 'crisis'],
    ['naiisip kong magpakamatay', 'crisis'],
    ['gusto kong saktan ang sarili ko', 'crisis'],
    ['I want to kill myself', 'crisis'],
    ['i want to die', 'crisis'],
    ['I might hurt myself', 'crisis'],
    ['suicidal thoughts', 'crisis'],
    ['may chest pain ako habang nag-jog', 'medical'],
    ['masakit sa dibdib, sakit sa dibdib talaga', 'medical'],
    ['nahimatay ako sa gym', 'medical'],
    ['I almost fainted', 'medical'],
    ['hindi ako makahinga kanina', 'medical'],
    ["I can't breathe well", 'medical'],
    ['shortness of breath after running', 'medical'],
    ['isusuka ko na lang yung kinain ko', 'eating'],
    ['sinuka ko yung lunch', 'eating'],
    ['ayokong kumain ngayon', 'eating'],
    ['hindi na ako kakain', 'eating'],
    ['I hate my body', 'eating'],
    ['gusto ko magpayat agad', 'eating']
  ])('"%s" -> %s', (text, hit) => expect(checkSafety(text)).toBe(hit))

  it.each([
    'nag-jog ako 30 mins',
    'kumain ako ng adobo',
    'almusal tapsilog tapos kape',
    '4 hrs lang tulog ko',
    'nag basketball kami 2 hours tapos nag milk tea'
  ])('normal log "%s" -> null', (text) => expect(checkSafety(text)).toBeNull())

  it('crisis wins over other hits', () =>
    expect(checkSafety('chest pain and I want to die')).toBe('crisis'))
})
