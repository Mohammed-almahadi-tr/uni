Imports System.Data.SqlClient
Public Class frmSearchStdID

    Sub FillColleges()
        Try
            Me.CombCollege.Items.Clear()
            Dim CollegeList As New ArrayList
            CollegeList = GetCollegesList()

            For Each CollegeName As String In CollegeList
                Me.CombCollege.Items.Add(CollegeName)
            Next
        Catch ex As Exception
            MsgBox(ex.ToString)
        End Try
    End Sub

    Sub FillBatches()
        Try
            Me.CombBatch.Items.Clear()
            Dim BatchList As New ArrayList
            BatchList = GetBatchesList()

            For Each BatchName As String In BatchList
                Me.CombBatch.Items.Add(BatchName)
            Next
        Catch ex As Exception
            MsgBox(ex.ToString)
        End Try
    End Sub

    Sub LoadStd()
        Try
            Me.Cursor = Cursors.WaitCursor

            Dim College As String = ""
            Dim Batch As String = ""

            If Me.CombCollege.SelectedIndex <> -1 Then
                College = " and College=N'" & Me.CombCollege.SelectedItem & "' "
            End If

            If Me.CombBatch.SelectedIndex <> -1 Then
                Batch = " and Batch=N'" & Me.CombBatch.SelectedItem & "' "
            End If

            Dim cmd As New SqlCommand("Select StdID,StdName,College,Batch From StdFinancial " & _
                                      "Where StdName like N'" & Me.txtFulName.Text & "%' " & _
                                      College & Batch & "Order by StdName", cnn)
            Dim Reader As SqlDataReader
            Me.ListView1.Items.Clear()

            cnn.Open()
            Reader = cmd.ExecuteReader
            While (Reader.Read)
                With ListView1.Items.Add(Reader.Item(0))
                    .SubItems.Add(Reader.Item(1))
                    .SubItems.Add(Reader.Item(2))
                    .SubItems.Add(Reader.Item(3))
                End With
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

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        If Len(Me.txtFulName.Text.Trim) = 0 Then
            Exit Sub
        End If

        LoadStd()
    End Sub

    Private Sub txtFulName_KeyUp(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles txtFulName.KeyUp
        If e.KeyCode = Keys.Enter Then
            If Len(Me.txtFulName.Text.Trim) = 0 Then
                Exit Sub
            End If

            LoadStd()
        End If
    End Sub

    Private Sub frmSearchStdID_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        FillBatches()
        FillColleges()
        SelStudID = ""
        SelStudName = ""
        Me.txtFulName.Focus()

    End Sub

    Private Sub ListView1_DoubleClick(ByVal sender As Object, ByVal e As System.EventArgs) Handles ListView1.DoubleClick
        If Me.ListView1.SelectedIndices.Count <> 0 Then
            SelStudID = Me.ListView1.SelectedItems.Item(0).Text
            SelStudName = Me.ListView1.SelectedItems.Item(0).SubItems(1).Text
            Me.Close()
        End If
    End Sub
End Class