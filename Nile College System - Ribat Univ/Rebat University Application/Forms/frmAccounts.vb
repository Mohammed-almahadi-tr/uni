Imports System.Data.SqlClient

Public Class frmAccounts

    Sub FillAcc1()
        Try
            Me.Cursor = Cursors.WaitCursor
            Me.CombAcc1.Items.Clear()
            Dim cmd As New SqlCommand("select Distinct Acc2 From Accounts Where Acc1=N'" & Me.CombMainAcc.SelectedItem & "'", cnn)
            Dim rdr As SqlDataReader

            cnn.Open()
            rdr = cmd.ExecuteReader
            While rdr.Read
                Me.CombAcc1.Items.Add(rdr.Item(0))
            End While
            cnn.Close()
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.Message)
        End Try
    End Sub

    Sub FillAcc2()
        Try
            Me.Cursor = Cursors.WaitCursor
            Me.CombAcc2.Items.Clear()
            Dim cmd As New SqlCommand("select Distinct Acc3 From Accounts Where Acc1=N'" & Me.CombMainAcc.SelectedItem & "' and Acc2=N'" & _
                                      Me.CombAcc1.SelectedItem & "' and Acc3 Is Not Null", cnn)
            Dim rdr As SqlDataReader

            cnn.Open()
            rdr = cmd.ExecuteReader
            While rdr.Read
                Me.CombAcc2.Items.Add(rdr.Item(0))
            End While
            cnn.Close()
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.Message)
        End Try
    End Sub

    Private Sub btnDept_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles btnDept.Click
        Try
            If Me.CombMainAcc.SelectedIndex = -1 Then
                MsgBox("الرجاء تحديد البند")
                Exit Sub
            End If
            Dim str As String
            str = InputBox("الرجاء إدخال الحساب")

            If Trim(str) = "" Then
                Exit Sub
            Else
                Me.Cursor = Cursors.WaitCursor
                Dim cmd As New SqlCommand("Insert Into Accounts (Acc1,Acc2) Values(N'" & _
                                          Me.CombMainAcc.SelectedItem & "',N'" & str & "')", cnn)
                cnn.Open()
                cmd.ExecuteNonQuery()
                cnn.Close()

                FillAcc1()
                FillTree()
                Me.CombAcc2.Items.Clear()
            End If
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.Message)
        End Try
    End Sub

    Private Sub btnSection_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles btnSection.Click
        Try
            Dim str As String
            str = InputBox("الرجاء إدخال الحساب")

            If Trim(str) = "" Or Me.CombAcc1.SelectedIndex = -1 Then
                Exit Sub
            Else
                Me.Cursor = Cursors.WaitCursor
                Dim cmd As New SqlCommand("Insert Into Accounts (Acc1,Acc2,Acc3) Values (N'" & Me.CombMainAcc.SelectedItem & _
                                          "',N'" & Me.CombAcc1.SelectedItem & "',N'" & str & "')", cnn)
                cnn.Open()
                cmd.ExecuteNonQuery()
                cnn.Close()

                FillAcc2()
                FillTree()
            End If
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.Message)
        End Try
    End Sub

    Private Sub frmAccounts_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        FillAcc1()
    End Sub

    Private Sub CombAcc1_SelectedIndexChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles CombAcc1.SelectedIndexChanged
        FillAcc2()
    End Sub

    Private Sub CombMainAcc_SelectedIndexChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles CombMainAcc.SelectedIndexChanged
        FillTree()
        FillAcc1()
        Me.CombAcc2.Items.Clear()
    End Sub

    Sub FillTree()
        Try
            Me.Cursor = Cursors.WaitCursor
            Dim cmd As New SqlCommand("Select Distinct Acc2 From Accounts Where Acc1=N'" & Me.CombMainAcc.SelectedItem & _
                                      "' and Acc2 Is Not Null", cnn)
            Dim Reader, Reader1 As SqlDataReader
            Dim i, i1 As Integer

            Me.TreeAcc.Nodes.Clear()

            cnn.Open()
            Reader = cmd.ExecuteReader
            While Reader.Read
                Me.TreeAcc.Nodes.Add(Reader.Item(0))
                Dim cmd1 As New SqlCommand("Select Distinct Acc3 From Accounts Where Acc1=N'" & Me.CombMainAcc.SelectedItem & _
                                           "' and Acc2=N'" & Reader.Item(0) & "' and Acc3 Is Not Null", cnn1)

                cnn1.Open()
                Reader1 = cmd1.ExecuteReader
                While Reader1.Read
                    Me.TreeAcc.Nodes(i).Nodes.Add(Reader1.Item(0))
                End While
                cnn1.Close()
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
            MsgBox(ex.ToString)
        End Try
    End Sub
End Class