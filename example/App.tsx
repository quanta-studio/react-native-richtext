import { SafeAreaView, ScrollView } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { RichText } from '@yk-yong/react-native-richtext'

const html = `
  <h1>react-native-richtext</h1>
  <p>A <strong>Fabric-native</strong> HTML renderer with <em>inline styles</em>,
     <a href="https://example.com">links</a>, and lists:</p>
  <ul><li>first item</li><li>second item</li></ul>
  <blockquote>A short quote &mdash; rendered natively.</blockquote>
  <pre>  preformatted
  text</pre>
`

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <RichText
          source={{ html }}
          baseStyle={{ fontSize: 16, color: '#1a1a1a' }}
          onLinkPress={(href) => console.log('link:', href)}
        />
      </ScrollView>
      <StatusBar style="auto" />
    </SafeAreaView>
  )
}
