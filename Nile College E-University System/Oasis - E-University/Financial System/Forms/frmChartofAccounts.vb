Imports System.Data.SqlClient

Public Class frmChartofAccounts

    Sub FillTree()
        Try
            Me.Cursor = Cursors.WaitCursor
            Dim cmd As New SqlCommand("Select Distinct Acc1 From Acc1 Where Acc1 Is Not Null", cnn)
            Dim Reader, Reader1, Reader2, Reader3, Reader4 As SqlDataReader
            Dim i, i1, i2, i3, i4 As Integer

            Me.TreeAcc.Nodes.Clear()

            cnn.Open()
            Reader = cmd.ExecuteReader
            While Reader.Read
                Me.TreeAcc.Nodes.Add(Reader.Item(0))
                Dim cmd1 As New SqlCommand("Select Distinct Acc2 From Acc1 Where Acc1=N'" & Reader.Item(0) & "' and Acc2 Is Not Null", cnn1)

                cnn1.Open()
                Reader1 = cmd1.ExecuteReader
                While Reader1.Read
                    Me.TreeAcc.Nodes(i).Nodes.Add(Reader1.Item(0))
                    Dim cmd2 As New SqlCommand("Select Distinct Acc3 From Acc1 Where Acc1=N'" & Reader.Item(0) & "' and " & _
                                               "Acc2=N'" & Reader1.Item(0) & "' and Acc3 Is Not Null", cnn2)

                    cnn2.Open()
                    Reader2 = cmd2.ExecuteReader
                    While Reader2.Read
                        Me.TreeAcc.Nodes(i).Nodes(i1).Nodes.Add(Reader2.Item(0))
                        Dim cmd3 As New SqlCommand("Select Distinct Acc4 From Acc1 Where Acc1=N'" & Reader.Item(0) & "' and " & _
                                                  "Acc2=N'" & Reader1.Item(0) & "' and Acc3=N'" & Reader2.Item(0) & _
                                                  "' and Acc4 Is Not Null", cnn3)

                        cnn3.Open()
                        Reader3 = cmd3.ExecuteReader
                        While Reader3.Read
                            Me.TreeAcc.Nodes(i).Nodes(i1).Nodes(i2).Nodes.Add(Reader3.Item(0))
                            'begin new code
                            Dim cmd4 As New SqlCommand("Select Distinct Acc5 From Acc1 Where Acc1=N'" & Reader.Item(0) & "' and " & _
                                                  "Acc2=N'" & Reader1.Item(0) & "' and Acc3=N'" & Reader2.Item(0) & _
                                                  "' and Acc4=N'" & Reader3.Item(0) & "' and Acc5 Is Not Null", cnn4)
                            cnn4.Open()
                            Reader4 = cmd4.ExecuteReader
                            While Reader4.Read
                                Me.TreeAcc.Nodes(i).Nodes(i1).Nodes(i2).Nodes(i3).Nodes.Add(Reader4.Item(0))
                                'end new code

                            End While
                            'new
                            cnn4.Close()
                            i3 += 1
                            
                            'end
                        End While
                        cnn3.Close()

                        i2 += 1
                    End While
                    cnn2.Close()

                    i2 = 0
                    i1 += 1
                End While

                cnn1.Close()
                i3 = 0
                i2 = 0
                i1 = 0
                i += 1
            End While
            cnn.Close()


            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
            If cnn2.State = ConnectionState.Open Then
                cnn2.Close()
            End If
            If cnn3.State = ConnectionState.Open Then
                cnn3.Close()
            End If
            If cnn4.State = ConnectionState.Open Then
                cnn4.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Sub ToolStripButton1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles ToolStripButton1.Click
        Dim a As New frmAddAccountOld
        a.Level = 0
        a.ShowDialog()

        If a.Saved = True Then
            Me.TreeAcc.Nodes.Add(a.AccountName)
        End If
    End Sub

    Sub Clear()
        Try
            Me.txtAcc1.Clear()
            Me.txtAcc2.Clear()
            Me.txtAcc3.Clear()
            Me.txtAcc4.Clear()
            Me.txtAcc5.Clear()
            Me.txtBalance.Clear()
        Catch ex As Exception
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Sub TreeAcc_AfterSelect(ByVal sender As System.Object, ByVal e As System.Windows.Forms.TreeViewEventArgs) Handles TreeAcc.AfterSelect
        Clear()
        Try
            If Me.TreeAcc.SelectedNode.Level = -1 Then
                Me.ToolStripButton1.Enabled = True
                Me.ToolStripButton2.Enabled = True
            ElseIf Me.TreeAcc.SelectedNode.Level = 4 Then
                Me.ToolStripButton1.Enabled = True
                Me.ToolStripButton2.Enabled = False
            Else
                Me.ToolStripButton1.Enabled = True
                Me.ToolStripButton2.Enabled = True
            End If

            Try
                If Me.TreeAcc.SelectedNode.Level = -1 Then
                    Exit Sub
                Else
                    Me.Cursor = Cursors.Default
                    Dim Balance As Double
                    Select Case Me.TreeAcc.SelectedNode.Level
                        Case 0
                            Me.txtAcc1.Text = Me.TreeAcc.SelectedNode.Text

                            Balance = GetBalanceAcc(Me.txtAcc1.Text.ToString)

                            If Balance < 0 Then
                                Me.txtBalance.Text = "(" & Format((-1 * Balance), "##,###.##") & ")"
                            ElseIf Balance = 0 Then
                                Me.txtBalance.Text = "0.0"
                            Else
                                Me.txtBalance.Text = Balance.ToString("N2")
                            End If
                        Case 1
                            Me.txtAcc1.Text = Me.TreeAcc.SelectedNode.Parent.Text.ToString
                            Me.txtAcc2.Text = Me.TreeAcc.SelectedNode.Text.ToString

                            Balance = GetBalanceAcc(Me.txtAcc1.Text.ToString, Me.txtAcc2.Text.ToString)
                            If Balance < 0 Then
                                Me.txtBalance.Text = "(" & Format((-1 * Balance), "##,###.##") & ")"
                            ElseIf Balance = 0 Then
                                Me.txtBalance.Text = "0.0"
                            Else
                                Me.txtBalance.Text = Balance.ToString("N2")
                            End If
                        Case 2
                            Me.txtAcc1.Text = Me.TreeAcc.SelectedNode.Parent.Parent.Text.ToString
                            Me.txtAcc2.Text = Me.TreeAcc.SelectedNode.Parent.Text.ToString
                            Me.txtAcc3.Text = Me.TreeAcc.SelectedNode.Text.ToString

                            Balance = GetBalanceAcc(Me.txtAcc1.Text.ToString, Me.txtAcc2.Text.ToString, Me.txtAcc3.Text.ToString)
                            If Balance < 0 Then
                                Me.txtBalance.Text = "(" & Format((-1 * Balance), "##,###.##") & ")"
                            ElseIf Balance = 0 Then
                                Me.txtBalance.Text = "0.0"
                            Else
                                Me.txtBalance.Text = Balance.ToString("N2")
                            End If
                        Case 3
                            Me.txtAcc1.Text = Me.TreeAcc.SelectedNode.Parent.Parent.Parent.Text.ToString
                            Me.txtAcc2.Text = Me.TreeAcc.SelectedNode.Parent.Parent.Text.ToString
                            Me.txtAcc3.Text = Me.TreeAcc.SelectedNode.Parent.Text.ToString
                            Me.txtAcc4.Text = Me.TreeAcc.SelectedNode.Text.ToString

                            Balance = GetBalanceAcc(Me.txtAcc1.Text.ToString, Me.txtAcc2.Text.ToString, _
                                                    Me.txtAcc3.Text.ToString, Me.txtAcc4.Text.ToString, Me.txtAcc5.Text.ToString)
                            If Balance < 0 Then
                                Me.txtBalance.Text = "(" & Format((-1 * Balance), "##,###.##") & ")"
                            ElseIf Balance = 0 Then
                                Me.txtBalance.Text = "0.0"
                            Else
                                Me.txtBalance.Text = Balance.ToString("N2")
                            End If
                        Case 4
                            Me.txtAcc1.Text = Me.TreeAcc.SelectedNode.Parent.Parent.Parent.Parent.Text.ToString
                            Me.txtAcc2.Text = Me.TreeAcc.SelectedNode.Parent.Parent.Parent.Text.ToString
                            Me.txtAcc3.Text = Me.TreeAcc.SelectedNode.Parent.Parent.Text.ToString
                            Me.txtAcc4.Text = Me.TreeAcc.SelectedNode.Parent.Text.ToString
                            Me.txtAcc5.Text = Me.TreeAcc.SelectedNode.Text.ToString
                            Balance = GetBalanceAcc(Me.txtAcc1.Text.ToString, Me.txtAcc2.Text.ToString, _
                                                    Me.txtAcc3.Text.ToString, Me.txtAcc4.Text.ToString, Me.txtAcc5.Text.ToString)
                            If Balance < 0 Then
                                Me.txtBalance.Text = "(" & Format((-1 * Balance), "##,###.##") & ")"
                            ElseIf Balance = 0 Then
                                Me.txtBalance.Text = "0.0"
                            Else
                                Me.txtBalance.Text = Balance.ToString("N2")
                            End If
                    End Select
                    Me.Cursor = Cursors.Default
                End If
            Catch ex As Exception
                Me.Cursor = Cursors.Default
                If cnn.State = ConnectionState.Open Then
                    cnn.Close()
                End If
                MsgBox(ex.ToString)
            End Try
        Catch ex As Exception
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Sub frmMngChrtOfAcc_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        FillTree()
    End Sub

    Private Sub ToolStripButton2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles ToolStripButton2.Click
        Try
            If Me.TreeAcc.SelectedNode.Index = -1 Then
                Exit Sub
            Else
                Dim a As New frmAddAccountOld
                Select Case Me.TreeAcc.SelectedNode.Level
                    Case 0
                        a.Acc1 = Me.TreeAcc.SelectedNode.Text
                        a.Level = 1
                    Case 1
                        a.Acc1 = Me.TreeAcc.SelectedNode.Parent.Text
                        a.Acc2 = Me.TreeAcc.SelectedNode.Text
                        a.Level = 2
                    Case 2
                        a.Acc1 = Me.TreeAcc.SelectedNode.Parent.Parent.Text
                        a.Acc2 = Me.TreeAcc.SelectedNode.Parent.Text
                        a.Acc3 = Me.TreeAcc.SelectedNode.Text
                        a.Level = 3
                    Case 3
                        a.Acc1 = Me.TreeAcc.SelectedNode.Parent.Parent.Parent.Text
                        a.Acc2 = Me.TreeAcc.SelectedNode.Parent.Parent.Text
                        a.Acc3 = Me.TreeAcc.SelectedNode.Parent.Text
                        a.Acc4 = Me.TreeAcc.SelectedNode.Text
                        a.Level = 4
                    Case 4
                        a.Acc1 = Me.TreeAcc.SelectedNode.Parent.Parent.Parent.Parent.Text
                        a.Acc2 = Me.TreeAcc.SelectedNode.Parent.Parent.Parent.Text
                        a.Acc3 = Me.TreeAcc.SelectedNode.Parent.Parent.Text
                        a.Acc4 = Me.TreeAcc.SelectedNode.Parent.Text
                        a.Acc5 = Me.TreeAcc.SelectedNode.Text
                        a.Level = 5
                End Select
                a.ShowDialog()

                If a.Saved = True Then
                    Me.TreeAcc.SelectedNode.Nodes.Add(a.AccountName)
                End If
                Me.Cursor = Cursors.Default
            End If
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Sub ToolStripButton3_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles ToolStripButton3.Click
        Try
            If Me.TreeAcc.SelectedNode.Level = -1 OrElse Me.txtBalance.Text.Trim.Length = 0 Then
                Exit Sub
            ElseIf CInt(Me.txtBalance.Text) <> 0 Then
                MsgBox("Can't delete , there is balance on the account : " & Me.txtBalance.Text.Trim.ToString("N2"))
                Exit Sub
            Else
                If MsgBox("Are You Sure To Delete ?", MsgBoxStyle.YesNoCancel) = MsgBoxResult.Yes Then
                    Me.Cursor = Cursors.WaitCursor
                    Dim StrIns As String

                    Select Case Me.TreeAcc.SelectedNode.Level
                        Case 0
                            StrIns = "Delete From Acc1 Where Acc1=N'" & Me.TreeAcc.SelectedNode.Text & "'"
                        Case 1
                            StrIns = "Delete From Acc1 Where Acc1=N'" & Me.TreeAcc.SelectedNode.Parent.Text & _
                                     "' and Acc2=N'" & Me.TreeAcc.SelectedNode.Text & "'"
                        Case 2
                            StrIns = "Delete From Acc1 Where Acc1=N'" & Me.TreeAcc.SelectedNode.Parent.Parent.Text & _
                                     "' and Acc2=N'" & Me.TreeAcc.SelectedNode.Parent.Text & _
                                     "' and Acc3=N'" & Me.TreeAcc.SelectedNode.Text & "'"
                        Case 3
                            StrIns = "Delete From Acc1 Where Acc1=N'" & Me.TreeAcc.SelectedNode.Parent.Parent.Parent.Text & _
                                     "' and Acc2=N'" & Me.TreeAcc.SelectedNode.Parent.Parent.Text & _
                                     "' and Acc3=N'" & Me.TreeAcc.SelectedNode.Parent.Text & "' and Acc4=N'" & Me.TreeAcc.SelectedNode.Text & "'"
                        Case 4
                            StrIns = "Delete From Acc1 Where Acc1=N'" & Me.TreeAcc.SelectedNode.Parent.Parent.Parent.Parent.Text & _
                                "' and Acc2=N'" & Me.TreeAcc.SelectedNode.Parent.Parent.Parent.Text & _
                                "' and Acc3=N'" & Me.TreeAcc.SelectedNode.Parent.Parent.Text & "' and Acc4=N'" & Me.TreeAcc.SelectedNode.Parent.Text &
                                 "' and Acc5=N'" & Me.TreeAcc.SelectedNode.Text & "'"
                    End Select
                    Dim cmd As New SqlCommand(StrIns, cnn)

                    cnn.Open()
                    cmd.ExecuteNonQuery()
                    cnn.Close()

                    FillTree()
                    Clear()

                    Me.Cursor = Cursors.Default
                End If
            End If
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    'Private Sub TreeAcc_DoubleClick(ByVal sender As Object, ByVal e As System.EventArgs) Handles TreeAcc.DoubleClick
    '    Clear()
    '    Try
    '        If Me.TreeAcc.SelectedNode.Level = -1 Then
    '            Exit Sub
    '        Else
    '            Me.Cursor = Cursors.Default
    '            Dim Balance As Double
    '            Select Case Me.TreeAcc.SelectedNode.Level
    '                Case 0
    '                    Me.txtAcc1.Text = Me.TreeAcc.SelectedNode.Text
    '                    Balance = GetBalanceAcc(Me.txtAcc1.Text.ToString)

    '                    If Balance < 0 Then
    '                        Me.txtBalance.Text = "(" & Format((-1 * Balance), "##,###.##") & ")"
    '                    ElseIf Balance = 0 Then
    '                        Me.txtBalance.Text = "0.0"
    '                    Else
    '                        Me.txtBalance.Text = Format(Balance, "##,###.##")
    '                    End If
    '                Case 1
    '                    Me.txtAcc1.Text = Me.TreeAcc.SelectedNode.Parent.Text.ToString
    '                    Me.txtAcc2.Text = Me.TreeAcc.SelectedNode.Text.ToString

    '                    Balance = GetBalanceAcc(Me.txtAcc1.Text.ToString, Me.txtAcc2.Text.ToString)
    '                    If Balance < 0 Then
    '                        Me.txtBalance.Text = "(" & Format((-1 * Balance), "##,###.##") & ")"
    '                    ElseIf Balance = 0 Then
    '                        Me.txtBalance.Text = "0.0"
    '                    Else
    '                        Me.txtBalance.Text = Format(Balance, "##,###.##")
    '                    End If
    '                Case 2
    '                    Me.txtAcc1.Text = Me.TreeAcc.SelectedNode.Parent.Parent.Text.ToString
    '                    Me.txtAcc2.Text = Me.TreeAcc.SelectedNode.Parent.Text.ToString
    '                    Me.txtAcc3.Text = Me.TreeAcc.SelectedNode.Text.ToString

    '                    Balance = GetBalanceAcc(Me.txtAcc1.Text.ToString, Me.txtAcc2.Text.ToString, Me.txtAcc3.Text.ToString)
    '                    If Balance < 0 Then
    '                        Me.txtBalance.Text = "(" & Format((-1 * Balance), "##,###.##") & ")"
    '                    ElseIf Balance = 0 Then
    '                        Me.txtBalance.Text = "0.0"
    '                    Else
    '                        Me.txtBalance.Text = Format(Balance, "##,###.##")
    '                    End If
    '                Case 3
    '                    Me.txtAcc1.Text = Me.TreeAcc.SelectedNode.Parent.Parent.Parent.Text.ToString
    '                    Me.txtAcc2.Text = Me.TreeAcc.SelectedNode.Parent.Parent.Text.ToString
    '                    Me.txtAcc3.Text = Me.TreeAcc.SelectedNode.Parent.Text.ToString
    '                    Me.txtAcc4.Text = Me.TreeAcc.SelectedNode.Text.ToString

    '                    Balance = GetBalanceAcc(Me.txtAcc1.Text.ToString, Me.txtAcc2.Text.ToString, _
    '                                            Me.txtAcc3.Text.ToString, Me.txtAcc4.Text.ToString)
    '                    If Balance < 0 Then
    '                        Me.txtBalance.Text = "(" & Format((-1 * Balance), "##,###.##") & ")"
    '                    ElseIf Balance = 0 Then
    '                        Me.txtBalance.Text = "0.0"
    '                    Else
    '                        Me.txtBalance.Text = Format(Balance, "##,###.##")
    '                    End If
    '            End Select
    '            Me.Cursor = Cursors.Default
    '        End If
    '    Catch ex As Exception
    '        Me.Cursor = Cursors.Default
    '        If cnn.State = ConnectionState.Open Then
    '            cnn.Close()
    '        End If
    '        MsgBox(ex.ToString)
    '    End Try
    'End Sub

    Private Sub ToolStripButton4_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles ToolStripButton4.Click
        FillTree()
    End Sub
End Class